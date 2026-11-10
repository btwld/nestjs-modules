import { Ability } from '@casl/ability';

import { type AccessAbility } from '../interfaces/access-ability.type.js';
import { type AccessRuleInterface } from '../interfaces/access-rule.interface.js';

import { accessFieldMatcher } from './access-field-matcher.util.js';

/**
 * Builds an ability from usable rules (see `accessRuleProblems`). Every
 * deny is placed after every allow, so a deny always wins: CASL lets the
 * last matching rule decide. Rules carry no conditions, so none are
 * matched.
 */
export function createAccessAbility(
  rules: readonly AccessRuleInterface[],
): AccessAbility {
  return new Ability<[string, string]>(
    [
      ...rules.filter((rule) => !rule.inverted),
      ...rules.filter((rule) => rule.inverted),
    ],
    { fieldMatcher: accessFieldMatcher },
  );
}
