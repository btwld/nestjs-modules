import { type AccessAbility } from '../interfaces/access-ability.type.js';
import { type AccessQueryInterface } from '../interfaces/access-query.interface.js';

/**
 * Whether the caller may read `path` of the resource a route let them act
 * on, whatever the route's action: a write's response shows what a read of
 * the same record would, so their `read` rules decide.
 */
export function canReadAccessField(
  ability: AccessAbility,
  query: Pick<AccessQueryInterface, 'resource'>,
  path: string,
): boolean {
  return ability.can('read', query.resource, path);
}
