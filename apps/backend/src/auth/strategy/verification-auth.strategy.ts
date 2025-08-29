import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../../env';
import { JWTDecoded } from '../../types/common';
import { AuthService } from '../auth.service';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class VerifyJWTStrategy extends PassportStrategy(
  Strategy,
  'jwt-verify'
) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
      audience: 'verify',
      issuer: 'swooshpay',
    });
  }

  async validate(payload: JWTDecoded) {
    const jti = await this.authService.getVerificationSession(payload.jti);
    if (!jti || jti.is_consumed)
      throw new BadRequestException('OTP already used');
    if (jti.expires_at < new Date())
      throw new BadRequestException('OTP expired');
    return payload;
  }
}
