import { type JwtFromRequestFunction } from 'passport-jwt';

export interface RefreshStrategyPolicySettingsInterface {
  jwtFromRequest?: JwtFromRequestFunction;
}

export class RefreshStrategyPolicy {
  readonly jwtFromRequest: JwtFromRequestFunction | undefined;

  constructor(settings: RefreshStrategyPolicySettingsInterface) {
    this.jwtFromRequest = settings.jwtFromRequest;
  }
}
