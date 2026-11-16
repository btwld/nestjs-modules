import { type AccessGrants } from '@concepta/nestjs-access-control';
import {
  type Actor,
  type AuthorityRuleInterface,
  type ActionEnum,
} from '@concepta/nestjs-core';

import { type AccessLevel } from './access-level.type.js';

type Verb = `${ActionEnum}`;

const VERBS_BY_LEVEL: Record<AccessLevel, Verb[]> = {
  none: [],
  'view-own': ['read'],
  view: ['read'],
  'edit-own': ['read', 'create', 'update'],
  edit: ['read', 'create', 'update'],
  full: ['read', 'create', 'update', 'delete'],
};

/**
 * The verbs a level holds only on the caller's own records. The
 * application's own data: grants carry the verbs, this says whose records
 * they reach.
 */
const OWN_ONLY_BY_LEVEL: Record<AccessLevel, Verb[]> = {
  none: [],
  'view-own': ['read'],
  view: [],
  'edit-own': ['create', 'update'],
  edit: [],
  full: [],
};

/**
 * The rules an access level stands for on one object.
 */
export function levelRules(
  subject: string,
  level: AccessLevel,
): AuthorityRuleInterface[] {
  const action = VERBS_BY_LEVEL[level];

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

/**
 * Whether the level holds the action only on the caller's own records.
 */
function levelOwnOnly(level: AccessLevel, action: string): boolean {
  return OWN_ONLY_BY_LEVEL[level].some((verb) => verb === action);
}

/**
 * Whether the actor may take the action only on their own records of the
 * subject: a person is limited unless one of their roles holds the action
 * on everyone's records, and anyone who is not a person is limited too.
 */
export function ownRecordsOnly(
  roles: Record<string, Record<string, AccessLevel>>,
  actor: Actor,
  subject: string,
  action: string,
): boolean {
  if (actor.kind !== 'role') {
    return true;
  }

  return !actor.roles.some((role) => {
    const level = roles[role]?.[subject] ?? 'none';

    return (
      VERBS_BY_LEVEL[level].some((verb) => verb === action) &&
      !levelOwnOnly(level, action)
    );
  });
}
