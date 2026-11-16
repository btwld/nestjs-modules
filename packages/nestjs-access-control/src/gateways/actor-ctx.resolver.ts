import { type ExecutionContext, type PlainLiteralObject } from '@nestjs/common';

import { type Actor, ActorCtx, AppContextHost } from '@concepta/nestjs-core';

import { type AccessActorResolverInterface } from '../domain/interfaces/access-actor-resolver.interface.js';

/**
 * The actor is whatever the `ActorCtx` overlay carries. Without it, the
 * `fallback` resolver decides, and without a fallback nobody is acting.
 */
export class ActorCtxResolver implements AccessActorResolverInterface {
  constructor(private readonly fallback?: AccessActorResolverInterface) {}

  async actorFor(
    ctx: PlainLiteralObject,
    context?: ExecutionContext,
  ): Promise<Actor | undefined> {
    const host = AppContextHost.from(ctx);

    if (host.supports(ActorCtx)) {
      return host.with(ActorCtx);
    }

    return this.fallback?.actorFor(ctx, context);
  }
}
