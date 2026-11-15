import { type CanActivate, Inject, Injectable } from '@nestjs/common';

import {
  RouteAuditRuleProvider,
  type RouteAuditRuleInterface,
  type RouteAuditSubjectInterface,
  type RouteAuditViolationInterface,
} from '@concepta/nestjs-core';

import { AUTHENTICATION_APP_GUARD_TOKEN } from '../../authentication.constants.js';
import { GuardsPolicy } from '../../domain/policies/guards.policy.js';
import { isAuthenticationGuard } from '../utils/authentication-guard.util.js';

/**
 * `requireAuth`: every route is authenticated, or marked public with core's
 * `@PublicRoute()`, which `@AuthPublic()` sets.
 *
 * A route is authenticated when an authentication guard runs on it: the JWT
 * guard the module registers globally, a guard given as `appGuard`, or a
 * guard built with `AuthGuard()` applied to the route or its controller.
 */
@Injectable()
@RouteAuditRuleProvider()
export class RequireAuthRouteAuditRule implements RouteAuditRuleInterface {
  readonly name = 'requireAuth';

  private readonly appGuardClass: unknown;

  constructor(
    @Inject(GuardsPolicy)
    private readonly guardsPolicy: GuardsPolicy,
    @Inject(AUTHENTICATION_APP_GUARD_TOKEN)
    appGuard: false | CanActivate,
  ) {
    // Only a class can be told apart: a plain object's class is `Object`,
    // which every other plain-object guard shares.
    const appGuardClass: unknown = appGuard ? appGuard.constructor : undefined;
    this.appGuardClass = appGuardClass === Object ? undefined : appGuardClass;
  }

  audit(subject: RouteAuditSubjectInterface): RouteAuditViolationInterface[] {
    if (!this.guardsPolicy.enable) {
      return [
        {
          message:
            'Authentication guards are turned off (settings.guards.enable is false), so the JWT guard lets every call through. Turn them back on.',
        },
      ];
    }

    if (
      subject.globalGuards.some(
        (guard) => guard === this.appGuardClass || isAuthenticationGuard(guard),
      )
    ) {
      return [];
    }

    const closed = subject.routes.filter((route) => !route.public);
    const open = closed.filter(
      (route) => !route.guards.some(isAuthenticationGuard),
    );

    if (open.length > 1 && open.length === closed.length) {
      return [
        {
          message:
            'No authentication guard runs on any route. Configure settings.strategies.jwt to register the JWT guard globally, or mark the routes that are open on purpose with @AuthPublic().',
        },
      ];
    }

    return open.map((route) => ({
      route: route.id,
      message:
        'No authentication guard runs on this route. Apply one, or mark the route @AuthPublic() if it is open on purpose.',
    }));
  }
}
