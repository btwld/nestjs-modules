import { Ability } from '@casl/ability';

import { type AuthorityRuleInterface } from '@concepta/nestjs-core';

import { type AccessAbility } from '../interfaces/access-ability.type.js';

import { accessFieldMatcher } from './access-field-matcher.util.js';

/**
 * Builds an ability from usable rules (see `authorityRuleProblems`). Every
 * deny is placed after every allow, so a deny always wins: CASL lets the
 * last matching rule decide. Rules carry no conditions, so none are
 * matched.
 */
export function createAccessAbility(
  rules: readonly AuthorityRuleInterface<string>[],
): AccessAbility {
  return new Ability<[string, string]>(
    [
      ...rules.filter((rule) => !rule.inverted),
      ...rules.filter((rule) => rule.inverted),
    ],
    { fieldMatcher: accessFieldMatcher },
  );
}
