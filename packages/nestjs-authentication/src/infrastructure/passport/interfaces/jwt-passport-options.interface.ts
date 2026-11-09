import { type StrategyOptions } from 'passport-jwt';

import { type JwtVerifyTokenCallback } from '../jwt-passport.types.js';

export interface JwtPassportOptionsInterface extends Pick<
  StrategyOptions,
  'jwtFromRequest'
> {
  verifyToken: JwtVerifyTokenCallback;
}
