import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { requireAppContext } from '@concepta/nestjs-core';

import { AuthUserCtx } from '../../../../../gateways/auth-user-context.overlay.js';

/**
 * Runs after the controller's `JwtGuard`, as an authorization guard would,
 * and records which user `AuthUserCtx` holds at that point.
 */
@Injectable()
export class AuthUserCtxProbeGuardFixture implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = requireAppContext(context);
    const request = context
      .switchToHttp()
      .getRequest<{ authUserIdInGuard?: string | null }>();

    request.authUserIdInGuard = ctx.supports(AuthUserCtx)
      ? (ctx.with(AuthUserCtx).user?.id ?? null)
      : null;

    return true;
  }
}
