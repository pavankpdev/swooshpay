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
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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

  @UseGuards(JwtAuthGuard)
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
    @CurrentUser() userId: string
  ) {
    const status = await this.authService.verifyOTP(userId, data.otp, 'signup');
    if (status) {
      await this.authService.confirmUser(userId);
      return {
        data: {
          message: 'User confirmed successfully',
        },
      };
    }

    throw new BadRequestException('Invalid OTP code');
  }
}
