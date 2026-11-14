/**
 * One thing a route audit rule found wrong.
 */
export interface RouteAuditViolationInterface {
  /**
   * The id of the route at fault. Leave it out for a fault of the whole
   * application, which `allow` can't exempt.
   */
  readonly route?: string;
  /** What is wrong, and how to fix it. */
  readonly message: string;
}
