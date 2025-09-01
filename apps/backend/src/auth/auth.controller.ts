import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CurrentUser } from '../utils/current-user';
import { AuthService } from './auth.service';
import {
  ConfirmUserDto,
  ForgotPwdUserDto,
  LoginDto,
  RegisterDto,
  ResetPwdUserDto,
} from './auth.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
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
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ example: { accessToken: 'accesstoken' } })
  async login(@CurrentUser() userId: string) {
    return this.authService.authenticate(userId);
  }

  @Public()
  @Post('register')
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
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

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ForgotPwdUserDto })
  @ApiOkResponse({
    example: {
      data: {
        accessToken: 'accesstoken',
        message: 'Please check your email for the OTP',
      },
    },
  })
  async forgotPassword(@Body() userData: ForgotPwdUserDto) {
    return this.authService.forgotPassword(userData.email);
  }

  @UseGuards(VerifyAuthGuard('forgot_password'))
  @Post('/verify/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('jwt')
  @ApiBody({ type: ConfirmUserDto })
  @ApiOkResponse({
    example: {
      data: {
        accessToken: 'accesstoken',
        message: 'OTP Verified',
      },
    },
  })
  async verifyResetPwdOtp(
    @Body() data: ConfirmUserDto,
    @DecodedOptions() decoded: JWTDecoded
  ) {
    const otpId = await this.authService.verifyOTP(
      decoded.sub,
      data.otp,
      'forgot_password'
    );
    if (otpId) {
      await this.authService.cleanupVerificationSessions(otpId, decoded.jti);
      const accessToken =
        await this.authService.getResetPasswordVerifiedSession(decoded.sub);
      return {
        data: {
          message: 'OTP Verified',
          accessToken,
        },
      };
    }

    throw new BadRequestException('Invalid OTP code');
  }

  @UseGuards(VerifyAuthGuard('reset_password'))
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('jwt')
  @ApiBody({ type: ResetPwdUserDto })
  @ApiOkResponse({
    example: {
      data: {
        message: 'Password was changed successfully, please login!',
      },
    },
  })
  async resetPassword(
    @Body() userData: ResetPwdUserDto,
    @DecodedOptions() decoded: JWTDecoded
  ) {
    const status = await this.authService.resetPassword(
      decoded.sub,
      userData.newPassword
    );
    if (status) {
      await this.authService.cleanupVerificationSessions(
        decoded.jti,
        decoded.jti
      );
      return {
        data: {
          message: 'Password was changed successfully, please login!',
        },
      };
    }
    throw new BadRequestException('Invalid OTP code');
  }

  @UseGuards(VerifyAuthGuard('signup'))
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ConfirmUserDto })
  @ApiBearerAuth('jwt')
  @ApiOkResponse({
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

  @UseGuards(VerifyAuthGuard(['signup', 'reset_password']))
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('jwt')
  @ApiOkResponse({
    example: {
      data: {
        message: 'OTP sent successfully',
      },
    },
  })
  async resendOTP(@DecodedOptions() decoded: JWTDecoded) {
    return this.authService.resendOTP(decoded.sub, 'signup', decoded.jti);
  }

  @Get('/session/verify/:id')
  @ApiOkResponse({
    example: {
      data: {
        accessToken: 'accesstoken',
      },
    },
  })
  async getVerificationSession(@Param('id') id: string) {
    return this.authService.buildNewVerificationSession(id);
  }
}
