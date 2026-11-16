import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { requireAppContext } from '@concepta/nestjs-core';

import { AuthUserCtx } from '../../gateways/auth-user-context.overlay.js';

export const AuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    requireAppContext(ctx).with(AuthUserCtx).user,
);
