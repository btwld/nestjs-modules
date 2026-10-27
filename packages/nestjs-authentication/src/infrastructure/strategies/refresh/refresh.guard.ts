import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { GuardsPolicy } from '../../../domain/policies/guards.policy.js';
import { AuthGuard } from '../../auth.guard.js';

import { RefreshUnauthorizedException } from './exceptions/refresh-unauthorized.exception.js';
import { REFRESH_STRATEGY_NAME } from './refresh.constants.js';

@Injectable()
export class RefreshGuard extends AuthGuard(REFRESH_STRATEGY_NAME, {
  canDisable: false,
}) {
  constructor(guardsPolicy: GuardsPolicy, reflector: Reflector) {
    super(guardsPolicy, reflector);
  }

  handleRequest<T>(err: Error | undefined, user: T, info?: Error) {
    if (err || !user) {
      // deliberately collapsed to one status: distinguishing "expired" from
      // "invalid signature" from "user deleted" is an oracle for an attacker.
      throw new RefreshUnauthorizedException({ originalError: err ?? info });
    }
    return user;
  }
}
