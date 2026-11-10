import { type ExecutionContext, type PlainLiteralObject } from '@nestjs/common';

import { AppContextHost } from '@concepta/nestjs-core';

import { type AccessActorResolverInterface } from '../domain/interfaces/access-actor-resolver.interface.js';
import { type AccessActor } from '../domain/interfaces/access-actor.type.js';

import { AccessCtx } from './interfaces/access-context.interface.js';

/**
 * The actor is whatever the `AccessCtx` overlay carries. Without it, the
 * `fallback` resolver decides, and without a fallback nobody is acting.
 */
export class AccessCtxActorResolver implements AccessActorResolverInterface {
  constructor(private readonly fallback?: AccessActorResolverInterface) {}

  async actorFor(
    ctx: PlainLiteralObject,
    context?: ExecutionContext,
  ): Promise<AccessActor | undefined> {
    const host = AppContextHost.from(ctx);

    if (host.supports(AccessCtx)) {
      return host.with(AccessCtx);
    }

    return this.fallback?.actorFor(ctx, context);
  }
}
