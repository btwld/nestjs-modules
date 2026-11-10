import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';

import { type AppContextHost, requireAppContext } from '@concepta/nestjs-core';

import {
  ACCESS_CONTROL_MODULE_GRANT_METADATA,
  ACCESS_CONTROL_MODULE_OWN_IN_HANDLER_METADATA,
  ACCESS_CONTROL_MODULE_QUERY_METADATA,
} from '../../access-control.constants.js';
import { AccessControlContext } from '../../domain/access-control.context.js';
import { PossessionEnum } from '../../domain/enums/possession.enum.js';
import { AccessControlException } from '../../domain/exceptions/access-control.exception.js';
import { AccessRefusedException } from '../../domain/exceptions/access-refused.exception.js';
import { type AccessControlGrantOptionInterface } from '../../domain/interfaces/access-control-grant-option.interface.js';
import { type AccessControlQueryOptionInterface } from '../../domain/interfaces/access-control-query-option.interface.js';
import { type AccessQueryInterface } from '../../domain/interfaces/access-query.interface.js';
import { type AccessResolutionInterface } from '../../domain/interfaces/access-resolution.interface.js';
import { AccessControlService } from '../../domain/services/access-control.service.js';
import { AccessCtx } from '../interfaces/access-context.interface.js';
import { AccessDecisionCtx } from '../interfaces/access-decision-context.interface.js';

const POSSESSIONS = [PossessionEnum.ANY, PossessionEnum.OWN];

/**
 * The calls this guard has let through. Private to the guard, so nothing
 * else can mark a call checked. Keyed by the call's context, which is new
 * for every call; a custom transport that reuses one across calls would
 * carry the actor and this mark over, as `findAppContext` documents.
 */
const CHECKED = new WeakSet<AppContextHost>();

/**
 * Checks a route's grants. Applied by `@AccessControlGrant` and its
 * shortcuts, on a method or a whole controller; a route without grants is
 * not checked.
 *
 * As a route guard it runs after every global guard, authentication's
 * included, and before every interceptor, so nothing can answer a checked
 * route before it does.
 *
 * The first grant the actor holds lets the call through, checking `any`
 * before `own`. An `own` grant counts only on a route with access query
 * services or `@AccessControlOwnInHandler`; elsewhere it is refused with
 * `own-unchecked`. The route's access query services, if any, then decide:
 * the call proceeds when one of them allows it. The actor is then defined
 * on the call's context as `AccessCtx`, so checks in the handler reuse it,
 * and the grant the call got in on is recorded, immutably, for
 * `AccessControlService.assertFields` and the response filter.
 */
@Injectable()
export class AccessControlGuard implements CanActivate {
  constructor(
    private readonly accessControl: AccessControlService,
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // A route's own metadata replaces its controller's.
    const targets = [context.getHandler(), context.getClass()];
    const grants =
      this.reflector.getAllAndOverride<
        AccessControlGrantOptionInterface[] | undefined
      >(ACCESS_CONTROL_MODULE_GRANT_METADATA, targets) ?? [];
    const queries =
      this.reflector.getAllAndOverride<
        AccessControlQueryOptionInterface[] | undefined
      >(ACCESS_CONTROL_MODULE_QUERY_METADATA, targets) ?? [];

    const [requested] = grants;

    if (!requested) {
      if (queries.length) {
        throw new AccessControlException({
          message:
            'A route with access query services needs a grant: they never run on their own',
          fault: 'usage',
        });
      }

      return true;
    }

    const ctx = requireAppContext(context);

    // A controller's grant and its route's both apply this guard, so it can
    // run twice for one call; the grants it reads are the same both times.
    // Asked of `CHECKED`, not of the decision overlay, which other code
    // could define first.
    if (CHECKED.has(ctx)) {
      return true;
    }

    // Only an HTTP request is trusted to carry the actor: elsewhere the
    // request is the message payload, which the caller controls. Other
    // transports define `AccessCtx` before the call.
    const resolution = await this.accessControl.resolve(
      ctx,
      context.getType() === 'http' ? context : undefined,
    );
    const requestedAction = `${requested.action}:${PossessionEnum.ANY}`;

    if (!resolution) {
      throw new AccessRefusedException({
        action: requestedAction,
        subject: requested.resource,
        reason: 'no-actor',
      });
    }

    // An `own` grant counts only where something checks the records are
    // the caller's: a query service, or a handler declared to. A route that
    // declares its own grant is not covered by its controller's declaration.
    const ownInHandlerTargets = this.reflector.get<unknown>(
      ACCESS_CONTROL_MODULE_GRANT_METADATA,
      context.getHandler(),
    )
      ? [context.getHandler()]
      : targets;
    const ownChecked =
      queries.length > 0 ||
      this.reflector.getAllAndOverride<boolean | undefined>(
        ACCESS_CONTROL_MODULE_OWN_IN_HANDLER_METADATA,
        ownInHandlerTargets,
      ) === true;
    const query = this.permittedQuery(
      resolution,
      grants,
      ownChecked ? POSSESSIONS : [PossessionEnum.ANY],
    );

    if (!query) {
      const ownOnly = ownChecked
        ? undefined
        : this.permittedQuery(resolution, grants, [PossessionEnum.OWN]);

      if (ownOnly) {
        throw new AccessRefusedException({
          action: `${ownOnly.action}:${ownOnly.possession}`,
          subject: ownOnly.resource,
          actor: resolution.actor,
          reason: 'own-unchecked',
        });
      }

      throw new AccessRefusedException(
        this.accessControl.refusal(
          resolution,
          requestedAction,
          requested.resource,
        ) ?? {
          action: requestedAction,
          subject: requested.resource,
          actor: resolution.actor,
          reason: 'no-grant',
        },
      );
    }

    if (
      !(await this.passesAccessQueries(
        context,
        ctx,
        resolution,
        query,
        queries,
      ))
    ) {
      throw new AccessRefusedException({
        action: `${query.action}:${query.possession}`,
        subject: query.resource,
        actor: resolution.actor,
        reason: 'access-query',
      });
    }

    if (!ctx.supports(AccessCtx)) {
      ctx.defineOverlay(AccessCtx, resolution.actor, { immutable: true });
    }

    // Immutable: `assertFields` and the response filter trust it.
    ctx.defineOverlay(
      AccessDecisionCtx,
      { query, ability: resolution.ability },
      { immutable: true },
    );
    CHECKED.add(ctx);

    return true;
  }

  private permittedQuery(
    resolution: AccessResolutionInterface,
    grants: AccessControlGrantOptionInterface[],
    possessions: PossessionEnum[],
  ): AccessQueryInterface | undefined {
    for (const grant of grants) {
      for (const possession of possessions) {
        const action = `${grant.action}:${possession}`;

        if (!this.accessControl.refusal(resolution, action, grant.resource)) {
          return {
            actor: resolution.actor,
            action: grant.action,
            possession,
            resource: grant.resource,
          };
        }
      }
    }

    return undefined;
  }

  private async passesAccessQueries(
    context: ExecutionContext,
    ctx: AppContextHost,
    resolution: AccessResolutionInterface,
    query: AccessQueryInterface,
    options: AccessControlQueryOptionInterface[],
  ): Promise<boolean> {
    if (!options.length) {
      return true;
    }

    // Only an HTTP call has a request; elsewhere the services decide from
    // the context.
    const request: unknown =
      context.getType() === 'http'
        ? context.switchToHttp().getRequest<unknown>()
        : undefined;

    for (const option of options) {
      const service = await this.moduleRef.resolve(option.service, undefined, {
        strict: false,
      });

      const allowed = await service.canAccess(
        new AccessControlContext({
          ctx,
          query,
          ability: resolution.ability,
          request,
          executionContext: context,
        }),
      );

      if (allowed) {
        return true;
      }
    }

    return false;
  }
}
