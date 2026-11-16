import { type JwtFromRequestFunction } from 'passport-jwt';

export interface JwtStrategyPolicySettingsInterface {
  jwtFromRequest?: JwtFromRequestFunction;
}

export class JwtStrategyPolicy {
  readonly jwtFromRequest: JwtFromRequestFunction | undefined;

  constructor(settings: JwtStrategyPolicySettingsInterface) {
    this.jwtFromRequest = settings.jwtFromRequest;
  }
}
