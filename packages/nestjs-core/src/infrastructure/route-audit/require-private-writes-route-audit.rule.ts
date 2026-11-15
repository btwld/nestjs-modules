import { Injectable } from '@nestjs/common';

import { RouteAuditRuleProvider } from './decorators/route-audit-rule-provider.decorator.js';
import { type RouteAuditRuleInterface } from './interfaces/route-audit-rule.interface.js';
import { type RouteAuditSubjectInterface } from './interfaces/route-audit-subject.interface.js';
import { type RouteAuditViolationInterface } from './interfaces/route-audit-violation.interface.js';

/** The methods that only read; every other one may write. */
const READ_METHODS: ReadonlySet<string> = new Set([
  'GET',
  'HEAD',
  'OPTIONS',
  'SEARCH',
  'PROPFIND',
  'QUERY',
]);

/**
 * `requirePrivateWrites`: no public route writes. A route marked public on
 * any method but `GET`, `HEAD`, `OPTIONS`, `SEARCH`, `PROPFIND` or `QUERY`,
 * `ALL` included, may let anyone write; list the ones meant to, such as
 * sign-in, in `allow`. Public means marked with `@PublicRoute()`: a marked
 * route that a guard of its own still authenticates is flagged too.
 */
@Injectable()
@RouteAuditRuleProvider()
export class RequirePrivateWritesRouteAuditRule implements RouteAuditRuleInterface {
  readonly name = 'requirePrivateWrites';

  audit(subject: RouteAuditSubjectInterface): RouteAuditViolationInterface[] {
    return subject.routes
      .filter((route) => route.public && !READ_METHODS.has(route.method))
      .map((route) => ({
        route: route.id,
        message:
          'This public route takes writes, so anyone may call it. Sign its callers in, or allow the route under requirePrivateWrites if anyone may write through it, such as to sign in.',
      }));
  }
}
