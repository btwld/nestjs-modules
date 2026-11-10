import { PossessionEnum } from '../enums/possession.enum.js';
import { type AccessAbility } from '../interfaces/access-ability.type.js';
import { type AccessQueryInterface } from '../interfaces/access-query.interface.js';

const READ_ANY = `read:${PossessionEnum.ANY}`;
const READ_OWN = `read:${PossessionEnum.OWN}`;

/**
 * Whether the caller may read `path` of the resource a route let them act
 * on, whatever the route's action: a write's response shows what a read of
 * the same record would. As on a read route, a caller holding `read:any`
 * is decided by their `read:any` rules; otherwise, on a call let through
 * on `own`, by their `read:own` rules.
 */
export function canReadAccessField(
  ability: AccessAbility,
  query: Pick<AccessQueryInterface, 'possession' | 'resource'>,
  path: string,
): boolean {
  if (ability.can(READ_ANY, query.resource)) {
    return ability.can(READ_ANY, query.resource, path);
  }

  return (
    query.possession === PossessionEnum.OWN &&
    ability.can(READ_OWN, query.resource, path)
  );
}
