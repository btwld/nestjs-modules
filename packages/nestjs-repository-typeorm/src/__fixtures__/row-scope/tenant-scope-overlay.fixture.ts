import { type ExecutionContext, Injectable } from '@nestjs/common';

import {
  ContextOverlayInterceptor,
  getAppContext,
} from '@concepta/nestjs-core';
import { RowScopeCtx } from '@concepta/nestjs-repository';

/**
 * Attaches the tenant scope from the request, before the handler runs — the
 * shape a real deployment uses, and the only supported way scope reaches a
 * resolver.
 *
 * The tenant comes from the **authenticated principal**, not from a request
 * header. A client-supplied `x-tenant-id` is a tenant-spoof unless something
 * upstream has already validated it: take it from a header only where a
 * trusted gateway sets it *and* the edge strips any inbound copy.
 *
 * Defined unconditionally rather than only when a tenant is present: where no
 * overlay exists, something later in the request could define one, and an
 * overlay that is always present and immutable cannot be supplied after the
 * fact. A missing tenant then surfaces as a refusal from the resolver instead
 * of as an absent scope.
 */
@Injectable()
export class TenantScopeOverlayFixture extends ContextOverlayInterceptor {
  readonly ref = RowScopeCtx;

  attach(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest<{
      user?: { tenantId?: string; role?: string };
    }>();

    getAppContext(request).defineOverlay(
      RowScopeCtx,
      {
        tenantId: request.user?.tenantId,
        role: request.user?.role,
      },
      { immutable: true },
    );
  }
}
