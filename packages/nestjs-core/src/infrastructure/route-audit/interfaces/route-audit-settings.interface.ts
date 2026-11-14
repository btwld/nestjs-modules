/**
 * Settings of the route audit, given as `routeAudit` to `CoreModule`.
 */
export interface RouteAuditSettingsInterface {
  /**
   * `throw` (the default) fails startup when a rule finds a violation;
   * `report` logs each one as a warning and starts.
   */
  mode?: 'throw' | 'report';
  /**
   * Routes exempt from a rule, by rule name then route id:
   * `{ requireAcl: ['GET /health'] }`. An entry that names no route, or
   * several, is itself a violation, so the list can't go stale.
   */
  allow?: Readonly<Record<string, readonly string[]>>;
}
