import {
  type AccessGrants,
  type AccessRuleInterface,
} from '@concepta/nestjs-access-control';

import { type AccessLevel } from './access-level.type.js';

const ACTIONS_BY_LEVEL: Record<AccessLevel, string[]> = {
  none: [],
  'view-own': ['read:own'],
  view: ['read:any'],
  'edit-own': ['read:any', 'create:own', 'update:own'],
  edit: ['read:any', 'create:any', 'update:any'],
  full: ['read:any', 'create:any', 'update:any', 'delete:any'],
};

/**
 * The rules an access level stands for on one object.
 */
export function levelRules(
  subject: string,
  level: AccessLevel,
): AccessRuleInterface[] {
  const action = ACTIONS_BY_LEVEL[level];

  return action.length ? [{ action, subject }] : [];
}

/**
 * Grants for roles described as a level per object, such as
 * `{ manager: { project: 'full' } }`.
 */
export function levelGrants(
  roles: Record<string, Record<string, AccessLevel>>,
): AccessGrants {
  return Object.fromEntries(
    Object.entries(roles).map(([role, levels]) => [
      `role:${role}`,
      Object.entries(levels).flatMap(([subject, level]) =>
        levelRules(subject, level),
      ),
    ]),
  );
}
