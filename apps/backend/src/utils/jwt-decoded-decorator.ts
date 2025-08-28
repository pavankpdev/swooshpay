import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JWTDecoded } from '../types/common';

export const DecodedOptions = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if ('user' in request) {
      return request.user as JWTDecoded;
    }
    return null;
  }
);
