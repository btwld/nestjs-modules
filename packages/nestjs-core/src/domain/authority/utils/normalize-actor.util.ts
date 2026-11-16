import { type Actor } from '../interfaces/actor.type.js';

/**
 * A copy of `actor` with exactly the properties its kind has, in a fixed
 * order: `{ kind: 'system', name }`, or `{ kind: 'role', roles, userId? }`
 * with `userId` only when it is set. Any other property is dropped, so an
 * actor a resolver built with more on it reaches an authority, or an
 * exception, as nothing but who is acting.
 */
export function normalizeActor(actor: Actor): Actor {
  if (actor.kind === 'system') {
    return { kind: 'system', name: actor.name };
  }

  return {
    kind: 'role',
    roles: [...actor.roles],
    ...(actor.userId === undefined ? {} : { userId: actor.userId }),
  };
}
