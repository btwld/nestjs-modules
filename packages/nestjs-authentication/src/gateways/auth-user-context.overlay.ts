import { ExecutionContext, Injectable } from '@nestjs/common';

import { ContextOverlayInterceptor, OverlayRef } from '@concepta/nestjs-core';

import { AuthenticatedUserInterface } from '../domain/interfaces/authenticated-user.interface.js';

import { AuthUserContextInterface } from './interfaces/auth-user-context.interface.js';

export const AuthUserCtx = new OverlayRef<
  'withAuthUser',
  AuthUserContextInterface
>('withAuthUser');

/**
 * Defines `AuthUserCtx` on calls no authentication guard defined it on,
 * such as public routes, where it holds no user. A guard that
 * authenticates a call defines it first, so guards after it can read the
 * user.
 */
@Injectable()
export class AuthUserContextOverlay extends ContextOverlayInterceptor {
  readonly ref = AuthUserCtx;

  attach(context: ExecutionContext): void {
    const ctx = this.appContext(context);

    if (ctx.supports(AuthUserCtx)) {
      return;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUserInterface }>();
    ctx.defineOverlay(AuthUserCtx, { user: request.user }, { immutable: true });
  }
}
