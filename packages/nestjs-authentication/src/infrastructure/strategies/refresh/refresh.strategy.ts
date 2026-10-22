import { Inject, Injectable } from '@nestjs/common';

import { getAppContext } from '@concepta/nestjs-core';

import {
  AUTHENTICATION_JWT_PORT_TOKEN,
  AUTHENTICATION_USER_PORT_TOKEN,
} from '../../../authentication.constants.js';
import { AuthorizationPayloadInterface } from '../../../domain/interfaces/authorization-payload.interface.js';
import { RefreshStrategyPolicy } from '../../../domain/policies/refresh-strategy.policy.js';
import { JwtPort } from '../../../domain/ports/jwt.port.js';
import { UserPort } from '../../../domain/ports/user.port.js';
import { JwtPassportStrategy } from '../../passport/jwt-passport.strategy.js';
import { PassportStrategyFactory } from '../../passport/passport-strategy.factory.js';
import { createVerifyTokenCallback } from '../../passport/utils/create-verify-token-callback.util.js';

import { RefreshUnauthorizedException } from './exceptions/refresh-unauthorized.exception.js';
import { REFRESH_STRATEGY_NAME } from './refresh.constants.js';

@Injectable()
export class RefreshStrategy extends PassportStrategyFactory<JwtPassportStrategy>(
  JwtPassportStrategy,
  REFRESH_STRATEGY_NAME,
) {
  constructor(
    @Inject(RefreshStrategyPolicy)
    policy: RefreshStrategyPolicy,
    @Inject(AUTHENTICATION_JWT_PORT_TOKEN)
    jwtPort: JwtPort,
    @Inject(AUTHENTICATION_USER_PORT_TOKEN)
    private userPort: UserPort,
  ) {
    super({
      jwtFromRequest: policy.jwtFromRequest,
      verifyToken: createVerifyTokenCallback(jwtPort, 'refresh'),
    });
  }

  async validate(payload: AuthorizationPayloadInterface, req: unknown) {
    const user = await this.userPort.getBySubject(
      getAppContext(req),
      payload.sub,
    );

    if (!user) {
      throw new RefreshUnauthorizedException();
    }

    return user;
  }
}
