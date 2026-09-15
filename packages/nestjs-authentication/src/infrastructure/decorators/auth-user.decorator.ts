import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { getAppContext } from '@concepta/nestjs-core';

import { AuthUserCtx } from '../../gateways/auth-user-context.overlay.js';

export const AuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return getAppContext(request).with(AuthUserCtx).user;
  },
);
