import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CurrentUser } from '../utils/current-user';
import { AuthService } from './auth.service';
import { ConfirmUserDto, LoginDto, RegisterDto } from './auth.dto';
import { ApiBearerAuth, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../utils/is-public.decorator';
import { VerifyAuthGuard } from './guards/verification-auth.guard';
import { DecodedOptions } from '../utils/jwt-decoded-decorator';
import { JWTDecoded } from '../types/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiBody({ type: LoginDto })
  // @ApiOkResponse({ type: Object, example: {accessToken: "accesstoken"} })
  async login(@CurrentUser() userId: string) {
    return this.authService.authenticate(userId);
  }

  @Public()
  @Post('register')
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({
    type: String,
    example: {
      data: {
        accessToken: 'accesstoken',
        message:
          'Registered successfully, please check your email for the confirmation code',
      },
    },
  })
  async register(@Body() userData: RegisterDto) {
    return this.authService.register(userData);
  }

  @UseGuards(VerifyAuthGuard)
  @Post('confirm')
  @ApiBody({ type: ConfirmUserDto })
  @ApiBearerAuth('jwt')
  @ApiOkResponse({
    type: String,
    example: {
      data: {
        message: 'User confirmed successfully',
      },
    },
  })
  async confirmUser(
    @Body() data: ConfirmUserDto,
    @DecodedOptions() decoded: JWTDecoded
  ) {
    const otpId = await this.authService.verifyOTP(
      decoded.sub,
      data.otp,
      'signup'
    );
    if (otpId) {
      await this.authService.confirmUser(decoded.sub);
      await this.authService.cleanupVerificationSessions(otpId, decoded.jti);
      return {
        data: {
          message: 'User confirmed successfully',
        },
      };
    }

    throw new BadRequestException('Invalid OTP code');
  }

  @UseGuards(VerifyAuthGuard)
  @Post('resend-otp')
  @ApiBearerAuth('jwt')
  @ApiOkResponse({
    type: String,
    example: {
      data: {
        message: 'OTP sent successfully',
      },
    },
  })
  async resendOTP(@DecodedOptions() decoded: JWTDecoded) {
    return this.authService.resendOTP(decoded.sub, 'signup', decoded.jti);
  }
}
