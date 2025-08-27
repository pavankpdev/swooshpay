import {
  BadRequestException,
  ConflictException,
  GoneException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './auth.dto';
import { DatabaseError } from 'pg';
import { NotificationService } from '../notification/notification.service';
import { comparePassword, createHash } from '../utils/crypto';
import { db } from '../db/connection';
import { sql, ValueExpression } from 'kysely';
import { DB, OtpPurpose } from '../db/generated/db';

@Injectable()
export class AuthService {
  private readonly MAX_ATTEMPTS = 3;
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(username: string, password: string) {
    const u = await this.usersService.findOneByUsername(username);
    if (!u) throw new NotFoundException('User not found');

    const passwordValid = await comparePassword(password, u.password as string);
    if (!passwordValid) throw new BadRequestException('Invalid password');

    return u.id;
  }

  async authenticate(userId: string) {
    const payload = { sub: userId };
    return {
      data: {
        accessToken: this.jwtService.sign(payload),
      },
    };
  }

  async register(user: RegisterDto) {
    try {
      const u = await this.usersService.createOne(user);
      if (!u) throw new HttpException('Something went wrong', 500);
      const OTP = await this.generateOTP(u.id, 'signup');
      await this.notificationService.sendEmail(
        user.email,
        'Welcome to SwooshPay',
        'Please confirm your email address to continue by entering the following code: ' +
          OTP
      );
      return {
        data: {
          message:
            'Registered successfully, please check your email for the confirmation code',
          accessToken: this.jwtService.sign({ sub: u.id }),
        },
      };
    } catch (error: unknown) {
      if (error instanceof DatabaseError) {
        if (error.code === '23505') {
          const msg = (error.constraint || '').toLowerCase();
          if (msg.includes('users_username_key')) {
            throw new ConflictException('Username already exists');
          }
          if (msg.includes('users_email_key')) {
            throw new ConflictException('Email already exists');
          }
          throw new ConflictException('Username or email already exists');
        }
      }

      // fallback for unexpected error types
      throw new InternalServerErrorException(
        'Something went wrong while creating account, please try again later'
      );
    }
  }

  async verifyOTP(userId: string, code: string, purpose: OtpPurpose) {
    try {
      const codeHash = createHash(code);
      const consumed = await db
        .updateTable('otps')
        .set(() => ({
          consumed_at: sql`NOW()`,
        }))
        .where('user_id', '=', userId)
        .where('purpose', '=', purpose)
        .where('consumed_at', 'is', null)
        .where('expires_at', '>', new Date())
        .where('attempts', '<', this.MAX_ATTEMPTS)
        .where('code_hash', '=', codeHash)
        .returning(['id'])
        .executeTakeFirst();

      if (consumed) {
        return true;
      }

      const bumped = await db
        .updateTable('otps')
        .set((eb) => ({
          attempts: eb('attempts', '+', 1),
        }))
        .where('user_id', '=', userId)
        .where('purpose', '=', purpose)
        .where('consumed_at', 'is', null)
        .where('expires_at', '>', new Date())
        .where('attempts', '<', this.MAX_ATTEMPTS)
        .where('code_hash', '=', codeHash)
        .returning(['attempts'])
        .executeTakeFirst();

      if (!bumped) {
        // No active OTP (expired or already used)
        throw new GoneException('OTP expired or already used');
      }

      if (bumped.attempts >= this.MAX_ATTEMPTS) {
        throw new HttpException(
          'Too many invalid attempts. Please request a new code.',
          429
        );
      }

      throw new BadRequestException('Invalid OTP code');
    } catch (err) {
      console.log(err);
      if (err instanceof HttpException) throw err;

      if (err instanceof DatabaseError) {
        // FOR INTERAL ERRORS
        console.log(err);

        console.log(
          { code: err.code, detail: err.detail },
          'OTP verify DB error'
        );
      }

      throw new InternalServerErrorException(
        'Could not verify code, please try again.'
      );
    }
  }

  async confirmUser(userId: string) {
    return this.usersService.updateOne(userId, { is_confirmed: true });
  }

  private async generateOTP(
    userId: string,
    purpose: ValueExpression<DB, 'otps', OtpPurpose>
  ) {
    try {
      console.log(userId, purpose);

      const code = this.generateUniqueDigitCode();
      const codeHash = createHash(code);

      await db
        .insertInto('otps')
        .values({
          user_id: userId,
          purpose,
          code_hash: codeHash,
          expires_at: new Date(Date.now() + 10 * 60_000),
          consumed_at: null,
        })
        .onConflict((oc) =>
          oc
            .columns(['user_id', 'purpose'])
            .where('consumed_at', 'is', null)
            .doUpdateSet({
              code_hash: codeHash,
              expires_at: new Date(Date.now() + 10 * 60_000),
              consumed_at: null,
              created_at: sql`NOW()`,
            })
        )
        .execute();
      return code;
    } catch (error) {
      console.log(error);
    }
  }

  private generateUniqueDigitCode(length = 6): string {
    if (!Number.isInteger(length) || length < 1 || length > 10) {
      throw new Error(
        `Invalid OTP length: ${length}. Must be an integer between 1 and 10.`
      );
    }

    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let code = '';

    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }

    return code;
  }
}
