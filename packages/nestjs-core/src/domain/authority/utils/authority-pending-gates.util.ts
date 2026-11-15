import { type AuthorityPendingGateInterface } from '../interfaces/authority-pending-gate.interface.js';
import { type AuthorityRuleInterface } from '../interfaces/authority-rule.interface.js';

/**
 * Every decision still pending in `rules`: one entry per action and subject
 * of each pending deny, with its gate and the fields it covers, in the order
 * given. For a review of what is still to be decided, such as an audit of
 * the rules an application stores.
 */
export function authorityPendingGates(
  rules: readonly AuthorityRuleInterface<string>[],
): AuthorityPendingGateInterface[] {
  return rules.flatMap(({ action, subject, fields, inverted, pending }) =>
    inverted === true && pending !== undefined
      ? [action].flat().flatMap((one) =>
          [subject].flat().map((each) => ({
            gate: pending,
            action: one,
            subject: each,
            ...(fields === undefined ? {} : { fields: [...fields] }),
          })),
        )
      : [],
  );
}
