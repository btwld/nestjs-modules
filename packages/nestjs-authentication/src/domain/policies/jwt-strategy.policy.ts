import { type JwtFromRequestFunction } from 'passport-jwt';

export interface JwtStrategyPolicySettingsInterface {
  jwtFromRequest?: JwtFromRequestFunction;
  requireUserValidation?: boolean;
}

export class JwtStrategyPolicy {
  readonly jwtFromRequest: JwtFromRequestFunction | undefined;
  readonly requireUserValidation: boolean;

  constructor(settings: JwtStrategyPolicySettingsInterface) {
    this.jwtFromRequest = settings.jwtFromRequest;
    this.requireUserValidation = settings.requireUserValidation ?? false;
  }
}
