/**
 * One HTTP route, as the route audit sees it at startup.
 */
export interface AuditedRouteInterface {
  /**
   * `METHOD /path`, before any global prefix, for example
   * `GET /invoices/:id`. A declared version is appended as `v2`, a declared
   * host as `@` and the host, so two routes that differ only by them have
   * different ids. `allow` entries name routes by this id.
   */
  readonly id: string;
  /**
   * The request method, as the id names it, for example `POST`; `ALL` for a
   * route that takes every method.
   */
  readonly method: string;
  /** The controller class. */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  readonly controller: Function;
  /** The route's handler, read with a `Reflector` beside `controller`. */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  readonly handler: Function;
  /**
   * The classes of the guards the controller and the route apply, in the
   * order they run. Global guards are on the subject, not here.
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  readonly guards: readonly Function[];
  /** Whether the route or its controller carries `@PublicRoute()`. */
  readonly public: boolean;
}
