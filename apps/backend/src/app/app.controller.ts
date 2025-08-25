import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../utils/current-user';

@Controller()
export class AppController {
  @Get()
  getData(@CurrentUser() userId: string) {
    return {
      userId,
    };
  }
}
