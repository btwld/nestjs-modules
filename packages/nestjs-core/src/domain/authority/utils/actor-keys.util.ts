import { type Actor } from '../interfaces/actor.type.js';

/**
 * The keys an actor's permissions are looked up by: `role:<name>` for each of
 * a person's roles, or `system:<name>` for a system.
 *
 * A person is never keyed by their user id; permissions for one person alone
 * are the implementer's to look up.
 */
export function actorKeys(actor: Actor): string[] {
  return actor.kind === 'system'
    ? [`system:${actor.name}`]
    : actor.roles.map((role) => `role:${role}`);
}
