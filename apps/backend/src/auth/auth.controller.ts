import { Controller, Post, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CurrentUser } from '../utils/current-user';
import { AuthService } from './auth.service';
import { LoginDto } from './auth.dto';
import { ApiBody } from '@nestjs/swagger';
import { Public } from '../utils/is-public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiBody({ type: LoginDto })
  async login(@CurrentUser() userId: string) {
    return this.authService.authenticate(userId);
  }
}
