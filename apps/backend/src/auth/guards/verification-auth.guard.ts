import { mixin, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OtpPurpose } from '../../db/generated/db';

export const VerifyAuthGuard = (expectedPurpose: OtpPurpose | OtpPurpose[]) => {
  class VerifyAuthGuardMixin extends AuthGuard('jwt-verify') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleRequest(err: any, user: any) {
      if (err || !user) {
        throw err || new UnauthorizedException();
      }

      if (expectedPurpose) {
        if (Array.isArray(expectedPurpose)) {
          if (!expectedPurpose.includes(user.purpose)) {
            throw new UnauthorizedException();
          }
        } else if (expectedPurpose !== user.purpose) {
          throw new UnauthorizedException();
        }
      }

      return user;
    }
  }

  return mixin(VerifyAuthGuardMixin);
};
