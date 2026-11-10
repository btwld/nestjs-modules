import { type ExecutionContext } from '@nestjs/common';

import { ContextOverlayInterceptor } from '@concepta/nestjs-core';

import { type AccessActorResolverInterface } from '../domain/interfaces/access-actor-resolver.interface.js';

import { AccessCtx } from './interfaces/access-context.interface.js';

/**
 * Defines `AccessCtx` on every HTTP call that does not carry it yet, using
 * the module's actor resolver, so handlers on routes without a grant can
 * check too. A checked route's guard has already defined it.
 *
 * Registered by the module when it has an actor resolver. The resolver
 * reads the request, which authentication has prepared before any
 * interceptor runs, so this overlay's place among the others does not
 * matter.
 */
export class AccessContextOverlay extends ContextOverlayInterceptor {
  readonly ref = AccessCtx;

  constructor(private readonly actorResolver: AccessActorResolverInterface) {
    super();
  }

  async attach(context: ExecutionContext): Promise<void> {
    const ctx = this.appContext(context);

    if (ctx.supports(AccessCtx)) {
      return;
    }

    const actor = await this.actorResolver.actorFor(ctx, context);

    if (actor) {
      ctx.defineOverlay(AccessCtx, actor, { immutable: true });
    }
  }
}
