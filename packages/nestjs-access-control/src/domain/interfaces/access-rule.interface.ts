/**
 * One grant, in CASL's raw rule shape and plain JSON, so it can be stored.
 *
 * - `action` is `<action>:<possession>`, such as `read:any` or
 *   `update:own`.
 * - `subject` is the resource the action applies to.
 * - `fields`, when given, limits the rule to those field paths. A path
 *   covers everything beneath it (`address` covers `address.city`). Paths
 *   are never patterns: a rule naming `*` is refused.
 * - `inverted: true` makes the rule a deny. A deny always wins over an allow,
 *   whichever role or rule source either comes from.
 *
 * Rules carry no conditions: which rows a caller reaches is row scope's
 * concern, not a grant's.
 */
export interface AccessRuleInterface {
  action: string | string[];
  subject: string | string[];
  fields?: string[];
  inverted?: boolean;
  reason?: string;
}
