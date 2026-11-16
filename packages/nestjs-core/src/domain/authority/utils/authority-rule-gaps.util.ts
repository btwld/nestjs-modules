import { type AuthorityRuleGapInterface } from '../interfaces/authority-rule-gap.interface.js';
import { type AuthorityRuleInterface } from '../interfaces/authority-rule.interface.js';

/**
 * Every action on every subject in `names` that no rule in `rules` decides
 * as a whole, allow or deny, pending ones included: one entry per subject
 * and action, subjects then actions in the order given. A pair that rules
 * name only with `fields` is listed with those fields. For a review that
 * every subject and action was decided: a pair no rule names is refused,
 * but nobody chose that. Pass every rule the application stores, for every
 * actor, checked first by `authorityRuleProblems`, which refuses `manage`
 * and `all`.
 *
 * @example
 * ```ts
 * authorityRuleGaps([{ action: 'read', subject: 'invoice' }], {
 *   subjects: ['invoice'],
 *   actions: ['read', 'approve'],
 * });
 * // [{ subject: 'invoice', action: 'approve' }]
 * ```
 */
export function authorityRuleGaps(
  rules: readonly AuthorityRuleInterface<string>[],
  names: { subjects: Iterable<string>; actions: Iterable<string> },
): AuthorityRuleGapInterface[] {
  const actions = [...new Set(names.actions)];

  return [...new Set(names.subjects)].flatMap((subject) =>
    actions.flatMap((action): AuthorityRuleGapInterface[] => {
      const naming = rules.filter(
        (rule) =>
          [rule.subject].flat().includes(subject) &&
          [rule.action].flat().includes(action),
      );
      if (naming.some((rule) => rule.fields === undefined)) return [];

      const fields = [...new Set(naming.flatMap((rule) => rule.fields ?? []))];
      return [{ subject, action, ...(fields.length ? { fields } : {}) }];
    }),
  );
}
