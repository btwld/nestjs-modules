import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ReferenceIdInterface } from '@concepta/nestjs-core';

import { GuardsPolicy } from '../../../domain/policies/guards.policy.js';
import { AuthGuard } from '../../auth.guard.js';

import { JwtUnauthorizedException } from './exceptions/jwt-unauthorized.exception.js';
import { JWT_STRATEGY_NAME } from './jwt.constants.js';

@Injectable()
export class JwtGuard extends AuthGuard(JWT_STRATEGY_NAME, {
  canDisable: true,
}) {
  constructor(guardsPolicy: GuardsPolicy, reflector: Reflector) {
    super(guardsPolicy, reflector);
  }

  handleRequest<T = ReferenceIdInterface>(
    err: Error | undefined,
    user: T,
    info?: Error,
  ) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      // deliberately collapsed to one status: distinguishing "expired" from
      // "invalid signature" from "user deleted" is an oracle for an attacker.
      throw new JwtUnauthorizedException({ originalError: err ?? info });
    }
    return user;
  }
}
