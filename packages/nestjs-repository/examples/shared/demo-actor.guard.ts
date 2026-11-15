import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { ActorCtx, getAppContext } from '@concepta/nestjs-core';
import { RowScopeCtx } from '@concepta/nestjs-repository';

/**
 * Stands in for authentication: `X-Roles: clerk,auditor` signs in a person
 * with those roles, and `X-Tenant: acme` puts them in a tenant. A request
 * without `X-Roles` has no actor.
 *
 * In your application, authentication signs the user in (`AuthUserCtx`)
 * and access control's `actorResolver`, or a guard of your own, defines
 * `ActorCtx` from the verified user instead, once and immutably, exactly as
 * this does.
 */
@Injectable()
export class DemoActorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const ctx = getAppContext(request);

    const roles = request.headers['x-roles'];
    if (roles) {
      ctx.defineOverlay(
        ActorCtx,
        { kind: 'role', roles: Object.freeze(roles.split(',')) },
        { immutable: true },
      );
    }

    const tenantId = request.headers['x-tenant'];
    if (tenantId) {
      ctx.defineOverlay(RowScopeCtx, { tenantId }, { immutable: true });
    }

    return true;
  }
}
