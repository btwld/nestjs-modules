import { authorityRuleProblems } from '@concepta/nestjs-core';

import { type AccessGrants } from '../interfaces/access-grants.type.js';

// A name as `actorKeys` builds it, spaces inside included; not one that
// starts or ends with a space, which is a typo (`role: admin`).
const ACTOR_KEY_PATTERN = /^(role|system):\S(.*\S)?$/;

/**
 * Every problem with grants keyed by actor: each key must be
 * `role:<name>` or `system:<name>`, and each rule set usable
 * (`authorityRuleProblems`).
 */
export function accessGrantsProblems(grants: AccessGrants): string[] {
  return Object.entries(grants).flatMap(([key, rules]) =>
    ACTOR_KEY_PATTERN.test(key)
      ? authorityRuleProblems(rules, key)
      : [`grants key "${key}": must be role:<name> or system:<name>`],
  );
}
