import {
  BadRequestException,
  ConflictException,
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
import { ValueExpression } from 'kysely';
import { DB, OtpPurpose } from '../db/generated/db';

@Injectable()
export class AuthService {
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
        data: 'Registered successfully, please check your email for the confirmation code',
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

  private async generateOTP(
    userId: string,
    purpose: ValueExpression<DB, 'otps', OtpPurpose>
  ) {
    const code = this.generateUniqueDigitCode();
    const codeHash = createHash(code);

    await db.insertInto('otps').values({
      user_id: userId,
      purpose,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + 10 * 60_000),
      consumed_at: null,
    });

    return code;
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
