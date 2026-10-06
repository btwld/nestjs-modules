import { Inject, Injectable } from '@nestjs/common';

import { ReferenceIdInterface, getAppContext } from '@concepta/nestjs-core';

import {
  AUTHENTICATION_JWT_PORT_TOKEN,
  AUTHENTICATION_USER_PORT_TOKEN,
} from '../../../authentication.constants.js';
import { AuthorizationPayloadInterface } from '../../../domain/interfaces/authorization-payload.interface.js';
import { JwtStrategyPolicy } from '../../../domain/policies/jwt-strategy.policy.js';
import { JwtPort } from '../../../domain/ports/jwt.port.js';
import { UserPort } from '../../../domain/ports/user.port.js';
import { JwtPassportStrategy } from '../../passport/jwt-passport.strategy.js';
import { PassportStrategyFactory } from '../../passport/passport-strategy.factory.js';
import { createVerifyTokenCallback } from '../../passport/utils/create-verify-token-callback.util.js';

import { JwtUnauthorizedException } from './exceptions/jwt-unauthorized.exception.js';
import { JWT_STRATEGY_NAME } from './jwt.constants.js';

@Injectable()
export class JwtStrategy extends PassportStrategyFactory<JwtPassportStrategy>(
  JwtPassportStrategy,
  JWT_STRATEGY_NAME,
) {
  constructor(
    @Inject(JwtStrategyPolicy)
    policy: JwtStrategyPolicy,
    @Inject(AUTHENTICATION_JWT_PORT_TOKEN)
    jwtPort: JwtPort,
    @Inject(AUTHENTICATION_USER_PORT_TOKEN)
    private userPort: UserPort,
  ) {
    super({
      jwtFromRequest: policy.jwtFromRequest,
      verifyToken: createVerifyTokenCallback(jwtPort, 'access'),
    });
  }

  async validate(
    payload: AuthorizationPayloadInterface,
    req: unknown,
  ): Promise<ReferenceIdInterface> {
    const user = await this.userPort.getBySubject(
      getAppContext(req),
      payload.sub,
    );

    if (user) {
      return user;
    } else {
      throw new JwtUnauthorizedException();
    }
  }
}
