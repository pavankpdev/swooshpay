import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './auth.dto';
import { DatabaseError } from 'pg';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findOneByUsername(username);
    // TODO: check with hashed password
    if (user && user.password === password) {
      return user.id;
    }

    return null;
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
      const OTP = '123456';
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
}
