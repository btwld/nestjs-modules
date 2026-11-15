import { type ActionEnum } from '../../enums/action.enum.js';

/**
 * One rule, in plain JSON so it can be stored. The same shape everywhere
 * rules are written: a repository's authority and access control's grants.
 *
 * - `action`: a verb, `create`, `read`, `update`, `delete`, `softDelete` or
 *   `restore`, or one of your own, such as `approve`.
 * - `subject`: what the action applies to.
 * - `fields`: when given, limits the rule to those fields. What a field is
 *   depends on where the rule is used: a repository matches a column by its
 *   exact name; access control matches a path in a request or response body,
 *   which covers everything beneath it.
 * - `inverted: true` makes the rule a deny. A deny always wins over an allow.
 * - `pending`: on a deny, the decision still pending behind it, named by the
 *   gate that closes it, such as `cfo-approval`. It refuses like any deny,
 *   and is reported as the refusal's `gate` when every deny that refused
 *   the call, or the field, is pending. A deny without it is final.
 * - `reason`: why the rule is there, for the people who maintain it. Never
 *   reported.
 *
 * The type parameters narrow what a rule may name, so a typo fails to
 * compile: `Action` defaults to `ActionEnum`'s six verbs. Widen it for verbs
 * of your own, or narrow it to the verbs you allow:
 *
 * ```ts
 * type Widened = AuthorityRuleInterface<`${ActionEnum}` | 'approve'>;
 * type Narrowed = AuthorityRuleInterface<'read' | 'update'>;
 * ```
 *
 * Rules read from storage are checked at runtime instead
 * (`authorityRuleProblems`).
 *
 * A rule never has conditions: which rows a caller reaches is row scope's
 * to decide.
 */
export interface AuthorityRuleInterface<
  Action extends string = `${ActionEnum}`,
  Subject extends string = string,
  Field extends string = string,
> {
  action: Action | Action[];
  subject: Subject | Subject[];
  fields?: Field[];
  inverted?: boolean;
  pending?: string;
  reason?: string;
}
