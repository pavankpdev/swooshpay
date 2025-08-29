import {
  BadRequestException,
  ConflictException,
  GoneException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './auth.dto';
import { DatabaseError } from 'pg';
import { NotificationService } from '../notification/notification.service';
import { comparePassword, createHash } from '../utils/crypto';
import { db } from '../db/connection';
import { sql } from 'kysely';
import { OtpPurpose } from '../db/generated/db';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
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
      const jti = await this.createVerificationSession(u.id, 'signup');
      await this.notificationService.sendEmail(
        user.email,
        'Welcome to SwooshPay',
        `Please confirm your email address to continue by entering the following code: ${OTP}, you can also use the following link to open the verification page: frontend_url/${jti}`
      );
      return {
        data: {
          message:
            'Registered successfully, please check your email for the confirmation code',
          accessToken: this.jwtService.sign(
            { sub: u.id, scope: ['verify_email'] },
            {
              expiresIn: '10m',
              audience: 'verify',
              issuer: 'swooshpay',
              jwtid: jti,
            }
          ),
        },
      };
    } catch (error: unknown) {
      this.logger.error(error);

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
        return consumed.id;
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
      this.logger.error(err);
      if (err instanceof HttpException) throw err;

      if (err instanceof DatabaseError) {
        // FOR INTERAL ERRORS
        this.logger.error(err);

        this.logger.error(
          { code: err.code, detail: err.detail },
          'OTP verify DB error'
        );
      }

      throw new InternalServerErrorException(
        'Could not verify code, please try again.'
      );
    }
  }

  async cleanupVerificationSessions(otpId: string, jwtId: string) {
    return db.transaction().execute(async (trx) => {
      await trx.deleteFrom('otps').where('id', '=', otpId).execute();

      await trx
        .updateTable('verification_sessions')
        .where('id', '=', jwtId)
        .set({ is_consumed: true })
        .execute();
    });
  }

  async confirmUser(userId: string) {
    return this.usersService.updateOne(userId, { is_confirmed: true });
  }

  async resendOTP(userId: string, purpose: OtpPurpose, jwtId: string) {
    // Generaye new OPT
    const otp = await this.generateOTP(userId, purpose);
    await this.createVerificationSession(userId, purpose, jwtId);
    const user = await this.usersService.findOneByAny(userId);
    if (!user)
      throw new NotFoundException('User was not found for this request');
    await this.notificationService.sendEmail(
      user.email,
      'Confirm your email address',
      'Please confirm your email address to continue by entering the following code: ' +
        otp
    );

    return {
      data: {
        message: 'OTP sent successfully',
      },
    };
  }

  async getVerificationSession(id: string) {
    return db
      .selectFrom('verification_sessions')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  async buildNewVerificationSession(sessionId: string) {
    const session = await this.getVerificationSession(sessionId);
    if (!session || session.is_consumed)
      throw new BadRequestException('OTP already used');
    if (session.expires_at < new Date())
      throw new BadRequestException('OTP expired');

    const accessToken = this.jwtService.sign(
      { sub: session.user_id, scope: ['verify_email'] },
      {
        expiresIn: '10m',
        audience: 'verify',
        issuer: 'swooshpay',
        jwtid: sessionId,
      }
    );
    return {
      data: {
        accessToken,
      },
    };
  }

  private async generateOTP(userId: string, purpose: OtpPurpose) {
    try {
      const code = this.generateUniqueDigitCode();
      const codeHash = createHash(code);
      const expires_at = new Date(Date.now() + 10 * 60_000);

      const row = await db
        .insertInto('otps')
        .values({
          user_id: userId,
          purpose,
          code_hash: codeHash,
          expires_at,
          consumed_at: null,
        })
        .onConflict((oc) =>
          oc
            .columns(['user_id', 'purpose'])
            .where('consumed_at', 'is', null)
            .where('expires_at', '>', new Date())
            .where('attempts', '<', this.MAX_ATTEMPTS)
            .doUpdateSet({
              code_hash: codeHash,
              expires_at,
              consumed_at: null,
              created_at: sql`NOW()`,
            })
        )
        .returning((rb) => [
          rb.ref('id').as('id'),
          rb.ref('attempts').as('attempts'),
          rb.ref('expires_at').as('expiresAt'),
        ])
        .executeTakeFirst();

      if (!row) {
        throw new BadRequestException(
          'OTP is expired or not found; please try again!'
        );
      }

      if (row.attempts >= this.MAX_ATTEMPTS) {
        throw new HttpException(
          'Too many attempts. Please try again later.',
          429
        );
      }

      return code;
    } catch (error) {
      this.logger.error(error);
      // fallback for unexpected error types
      throw new InternalServerErrorException(
        'Something went wrong while creating account, please try again later'
      );
    }
  }

  private async createVerificationSession(
    userId: string,
    purpose: OtpPurpose,
    jti?: string
  ) {
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const id = jti || randomUUID();

    const row = await db
      .insertInto('verification_sessions')
      .values({
        id,
        user_id: userId,
        purpose,
        expires_at: expiresAt,
      })
      .onConflict((oc) =>
        oc
          .columns(['id'])
          .where('expires_at', '>', new Date())
          .where('attempts', '<', this.MAX_ATTEMPTS)
          .where('is_consumed', '=', false)
          .doUpdateSet((eb) => ({
            attempts: eb('verification_sessions.attempts', '+', 1),
            expires_at: expiresAt,
          }))
      )
      .returning((rb) => [
        rb.ref('id').as('id'),
        rb.ref('attempts').as('attempts'),
        rb.ref('expires_at').as('expiresAt'),
      ])
      .executeTakeFirst();

    if (!row) {
      throw new BadRequestException(
        'Verification session is expired or not found; please try again!'
      );
    }

    if (row.attempts >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many attempts. Please try again later.',
        429
      );
    }
    return id;
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
