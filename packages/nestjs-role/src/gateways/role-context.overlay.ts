import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  ContextOverlayInterceptor,
  getAppContext,
  OverlayRef,
} from '@concepta/nestjs-core';

import {
  ROLE_NAMESPACE_KEY,
  RoleNamespaceOptions,
} from './decorators/role-namespace.decorator.js';
import { RoleContextInterface } from './interfaces/role-context.interface.js';

export const RoleCtx = new OverlayRef<'withRole', RoleContextInterface>(
  'withRole',
);

@Injectable()
export class RoleContextOverlay extends ContextOverlayInterceptor {
  readonly ref = RoleCtx;

  constructor(private readonly reflector: Reflector) {
    super();
  }

  attach(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest();
    const ctx = getAppContext(request);
    const resolved = this.resolve(context);
    ctx.defineOverlay(RoleCtx, resolved);
  }

  private resolve(context: ExecutionContext): RoleContextInterface {
    const options = this.reflector.getAllAndOverride<RoleNamespaceOptions>(
      ROLE_NAMESPACE_KEY,
      [context.getHandler(), context.getClass()],
    );
    return { namespace: options?.name ?? '' };
  }
}
