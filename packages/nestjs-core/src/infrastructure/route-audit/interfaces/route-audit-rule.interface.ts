import { type RouteAuditSubjectInterface } from './route-audit-subject.interface.js';
import { type RouteAuditViolationInterface } from './route-audit-violation.interface.js';

/**
 * A check the route audit runs over every route at startup. Register the
 * class with `@RouteAuditRuleProvider()`.
 */
export interface RouteAuditRuleInterface {
  /**
   * The rule's name, as `allow` and the audit's messages name it, for
   * example `requireAuth`.
   */
  readonly name: string;
  /** Every violation found; an empty list when the routes pass. */
  audit(
    subject: RouteAuditSubjectInterface,
  ): readonly RouteAuditViolationInterface[];
}
