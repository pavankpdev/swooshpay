import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CurrentUser } from '../utils/current-user';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../utils/is-public.decorator';

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
    example:
      'Registered successfully, please check your email for the confirmation code',
  })
  async register(@Body() userData: RegisterDto) {
    return this.authService.register(userData);
  }
}
