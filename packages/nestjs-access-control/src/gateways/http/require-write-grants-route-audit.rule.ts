import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  isReadMethod,
  RouteAuditRuleProvider,
  type RouteAuditRuleInterface,
  type RouteAuditSubjectInterface,
  type RouteAuditViolationInterface,
} from '@concepta/nestjs-core';

import { ACCESS_CONTROL_MODULE_GRANT_METADATA } from '../../access-control.constants.js';
import { type AccessControlGrantOptionInterface } from '../../domain/interfaces/access-control-grant-option.interface.js';

/**
 * `requireWriteGrants`: no route that may write lets a caller in on a `read`
 * grant. A route lets a caller in on any one of its grants, so a `POST`
 * granting `read` beside `create` lets every reader write. Any other
 * action counts, your own included, such as `approve`. A route on `GET`,
 * `HEAD`, `OPTIONS`, `SEARCH`, `PROPFIND` or `QUERY` only reads; every
 * other method may write, `ALL` included. List a write-method route that
 * only reads, such as a search, in `allow`.
 */
@Injectable()
@RouteAuditRuleProvider()
export class RequireWriteGrantsRouteAuditRule implements RouteAuditRuleInterface {
  readonly name = 'requireWriteGrants';

  constructor(private readonly reflector: Reflector) {}

  audit(subject: RouteAuditSubjectInterface): RouteAuditViolationInterface[] {
    return subject.routes
      .filter(
        (route) =>
          !isReadMethod(route.method) &&
          (
            this.reflector.getAllAndOverride<
              AccessControlGrantOptionInterface[] | undefined
            >(ACCESS_CONTROL_MODULE_GRANT_METADATA, [
              route.handler,
              route.controller,
            ]) ?? []
          ).some((grant) => grant.action === 'read'),
      )
      .map((route) => ({
        route: route.id,
        message:
          "This route may write, but a read grant lets callers in, so every reader may call it. Grant the write's own action instead, such as @AccessControlCreateOne() or your own verb, or allow the route under requireWriteGrants if it only reads, such as a search.",
      }));
  }
}
