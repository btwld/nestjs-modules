import {
  type ExecutionContext,
  Injectable,
  type PlainLiteralObject,
} from '@nestjs/common';

import { AuthUserCtx } from '@concepta/nestjs-authentication';
import {
  type Actor,
  AppContextHost,
  ContextOverlayInterceptor,
} from '@concepta/nestjs-core';
import { RowScopeCtx } from '@concepta/nestjs-repository';

import { type AccessActorResolverInterface } from '../../domain/interfaces/access-actor-resolver.interface.js';

import { type AttackUserInterface } from './attack-user.interface.js';
import { AttackUserStore } from './attack-user.store.js';

/**
 * The stored user authentication signed in on this call, or `null` on a
 * call nobody authenticated. Only the verified user's id is trusted; every
 * other property is read from the user table, never from the request.
 */
function signedInUser(
  ctx: AppContextHost,
  users: AttackUserStore,
): AttackUserInterface | null {
  const id = ctx.supports(AuthUserCtx) ? ctx.with(AuthUserCtx).user?.id : null;
  const user = id ? users.byId(id) : null;

  return user?.active === true ? user : null;
}

/** Who is acting: the signed-in user, through the roles they are stored with. */
@Injectable()
export class AttackActorResolver implements AccessActorResolverInterface {
  constructor(private readonly users: AttackUserStore) {}

  async actorFor(ctx: PlainLiteralObject): Promise<Actor | undefined> {
    const user = signedInUser(AppContextHost.from(ctx), this.users);

    return user
      ? { kind: 'role', roles: [...user.roles], userId: user.id }
      : undefined;
  }
}

/**
 * The tenant every repository call is scoped to: the signed-in user's.
 * Defined on every call, so nothing later can supply one; a call nobody
 * signed in to has none, and the row scope refuses it.
 */
@Injectable()
export class AttackTenantOverlay extends ContextOverlayInterceptor {
  readonly ref = RowScopeCtx;

  constructor(private readonly users: AttackUserStore) {
    super();
  }

  attach(context: ExecutionContext): void {
    const ctx = this.appContext(context);
    const user = signedInUser(ctx, this.users);

    ctx.defineOverlay(RowScopeCtx, user ? { tenantId: user.tenantId } : {}, {
      immutable: true,
    });
  }
}
