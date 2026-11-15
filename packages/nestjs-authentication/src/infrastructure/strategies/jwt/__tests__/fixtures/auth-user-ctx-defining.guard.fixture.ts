import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { requireAppContext } from '@concepta/nestjs-core';

import { AuthUserCtx } from '../../../../../gateways/auth-user-context.overlay.js';

import { OWN_GUARD_USER } from './request-user-only.guard.fixture.js';

/**
 * A guard of the implementer's own that authenticates as documented:
 * it defines `AuthUserCtx` itself, immutably, when nothing has yet.
 */
@Injectable()
export class AuthUserCtxDefiningGuardFixture implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = requireAppContext(context);
    if (!ctx.supports(AuthUserCtx)) {
      ctx.defineOverlay(
        AuthUserCtx,
        { user: OWN_GUARD_USER },
        { immutable: true },
      );
    }
    return true;
  }
}
