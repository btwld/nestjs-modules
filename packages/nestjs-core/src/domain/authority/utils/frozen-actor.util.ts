import { type Actor } from '../interfaces/actor.type.js';

/**
 * A copy of `actor` whose `roles` cannot change, for defining `ActorCtx`:
 * an immutable overlay freezes one level only, and everything the call
 * reaches decides for this actor.
 */
export function frozenActor(actor: Actor): Actor {
  return actor.kind === 'role'
    ? { ...actor, roles: Object.freeze([...actor.roles]) }
    : { ...actor };
}
