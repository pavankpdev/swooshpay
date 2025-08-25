import { Controller, Get } from '@nestjs/common';
import { Public } from '../utils/is-public.decorator';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  @Public()
  @Get('/health')
  @ApiOkResponse({ description: 'All Good!' })
  @ApiOkResponse({ description: 'Something went wrong' })
  getData() {
    return 'All Good!';
  }
}
