import { type ExecutionContext, type PlainLiteralObject } from '@nestjs/common';

import { type AccessAbility } from './access-ability.type.js';
import { type AccessActor } from './access-actor.type.js';
import { type AccessQueryInterface } from './access-query.interface.js';

/**
 * What an access query service is given to decide a route.
 */
export interface AccessControlContextInterface {
  /** The call's context, as handlers receive it. */
  getContext(): PlainLiteralObject;
  /** Who is acting. */
  getActor(): AccessActor;
  /** The grant the route was let through on. */
  getQuery(): AccessQueryInterface;
  /** The actor's ability, for further checks. */
  getAbility(): AccessAbility;
  /** The request, or one of its properties (`params`, `body`, `query`). */
  getRequest(property?: string): unknown;
  getExecutionContext(): ExecutionContext;
}
