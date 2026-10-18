import { ExecutionContext, Injectable } from '@nestjs/common';

import { ContextOverlayInterceptor, OverlayRef } from '@concepta/nestjs-core';

import { AuthenticatedUserInterface } from '../domain/interfaces/authenticated-user.interface.js';

import { AuthUserContextInterface } from './interfaces/auth-user-context.interface.js';

export const AuthUserCtx = new OverlayRef<
  'withAuthUser',
  AuthUserContextInterface
>('withAuthUser');

@Injectable()
export class AuthUserContextOverlay extends ContextOverlayInterceptor {
  readonly ref = AuthUserCtx;

  attach(context: ExecutionContext): void {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUserInterface }>();
    this.appContext(context).defineOverlay(AuthUserCtx, { user: request.user });
  }
}
