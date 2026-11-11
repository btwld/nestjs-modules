import { type ExecutionContext, type PlainLiteralObject } from '@nestjs/common';

import { type Actor } from '@concepta/nestjs-core';

/**
 * Works out who is acting for a call that does not already carry an
 * `ActorCtx` overlay. Returning `undefined` refuses the call.
 *
 * On an HTTP call, `context` is its execution context, so the actor can be
 * read from the authenticated request: route checks run after every global
 * guard, authentication's included. Elsewhere, such as a `can` or `assert`
 * call in a handler, or a call on another transport, `context` is
 * `undefined`.
 */
export interface AccessActorResolverInterface {
  actorFor(
    ctx: PlainLiteralObject,
    context?: ExecutionContext,
  ): Promise<Actor | undefined>;
}
