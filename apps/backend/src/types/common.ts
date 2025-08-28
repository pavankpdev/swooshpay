export type JWTDecoded = {
  sub: string;
  jti: string;
  aud: string;
  issuer: string;
  scope?: string[];
};
