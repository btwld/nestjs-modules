import { type ExecutionContext, Injectable } from '@nestjs/common';

import { ContextOverlayInterceptor } from '@concepta/nestjs-core';
import { RowScopeCtx } from '@concepta/nestjs-repository';

import { type RlsPrincipalFixture } from './rls-principal.interface.fixture.js';

/**
 * Stands in for authentication: the principal comes from `x-tenant`,
 * `x-user` and `x-role` test headers. A real application takes it from the
 * authenticated user, never from client headers.
 */
@Injectable()
export class RlsPrincipalOverlayFixture extends ContextOverlayInterceptor {
  readonly ref = RowScopeCtx;

  attach(context: ExecutionContext): void {
    const { headers } = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const principal: RlsPrincipalFixture = {};

    if (headers['x-tenant']) {
      principal.tenantId = headers['x-tenant'];
    }
    if (headers['x-user']) {
      principal.userId = headers['x-user'];
    }
    if (headers['x-role'] === 'tenant-admin') {
      principal.role = 'tenant-admin';
    }

    this.appContext(context).defineOverlay(RowScopeCtx, principal, {
      immutable: true,
    });
  }
}
