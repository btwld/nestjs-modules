import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  RouteAuditRuleProvider,
  type RouteAuditRuleInterface,
  type RouteAuditSubjectInterface,
  type RouteAuditViolationInterface,
} from '@concepta/nestjs-core';

import { ACCESS_CONTROL_MODULE_GRANT_METADATA } from '../../access-control.constants.js';
import { type AccessControlGrantOptionInterface } from '../../domain/interfaces/access-control-grant-option.interface.js';

/**
 * `requireAcl`: every route that isn't public declares an access-control
 * grant. A route without one is open to every caller who gets past
 * authentication.
 */
@Injectable()
@RouteAuditRuleProvider()
export class RequireAclRouteAuditRule implements RouteAuditRuleInterface {
  readonly name = 'requireAcl';

  constructor(private readonly reflector: Reflector) {}

  audit(subject: RouteAuditSubjectInterface): RouteAuditViolationInterface[] {
    return subject.routes
      .filter(
        (route) =>
          !route.public &&
          !this.reflector.getAllAndOverride<
            AccessControlGrantOptionInterface[] | undefined
          >(ACCESS_CONTROL_MODULE_GRANT_METADATA, [
            route.handler,
            route.controller,
          ])?.length,
      )
      .map((route) => ({
        route: route.id,
        message:
          'No access-control grant on this route, so every signed-in caller may call it. Add a grant decorator, such as @AccessControlReadMany(), or allow the route under requireAcl if every caller may.',
      }));
  }
}
