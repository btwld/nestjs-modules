import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';

import {
  ActorCtx,
  type AppContextHost,
  requireAppContext,
} from '@concepta/nestjs-core';

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
import { type AccessRefusedDetailsInterface } from '../../domain/interfaces/access-refused-details.interface.js';
import { type AccessResolutionInterface } from '../../domain/interfaces/access-resolution.interface.js';
import { AccessControlService } from '../../domain/services/access-control.service.js';
import { frozenActor } from '../../domain/utils/frozen-actor.util.js';
import { type AccessAuthorizedGrantInterface } from '../interfaces/access-authorized-grant.interface.js';
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
 * on the call's context as `ActorCtx`, so checks in the handler, and the
 * repositories it calls, decide for the same actor,
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
    // transports define `ActorCtx` before the call.
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

    // Each grant as the module's authority answers it; with no authority,
    // the actor's rules alone.
    const authorized: AccessAuthorizedGrantInterface[] = [];
    let authorityRefusal: AccessRefusedDetailsInterface | undefined;
    for (const grant of grants) {
      const authorization = await this.accessControl.authorize(
        ctx,
        resolution,
        grant.action,
        grant.resource,
      );

      if (authorization.allowed) {
        authorized.push({ grant, resolution: authorization.resolution });
      } else {
        authorityRefusal ??= authorization.refusal;
      }
    }

    const [first] = authorized;
    if (!first) {
      throw new AccessRefusedException(
        authorityRefusal ?? {
          action: requestedAction,
          subject: requested.resource,
          actor: resolution.actor,
          reason: 'authority',
        },
      );
    }

    const permitted = this.permittedQuery(
      authorized,
      ownChecked ? POSSESSIONS : [PossessionEnum.ANY],
    );

    if (!permitted) {
      const ownOnly = ownChecked
        ? undefined
        : this.permittedQuery(authorized, [PossessionEnum.OWN]);

      if (ownOnly) {
        throw new AccessRefusedException({
          action: `${ownOnly.query.action}:${ownOnly.query.possession}`,
          subject: ownOnly.query.resource,
          actor: resolution.actor,
          reason: 'own-unchecked',
        });
      }

      const firstAction = `${first.grant.action}:${PossessionEnum.ANY}`;
      throw new AccessRefusedException(
        this.accessControl.refusal(
          first.resolution,
          firstAction,
          first.grant.resource,
        ) ?? {
          action: firstAction,
          subject: first.grant.resource,
          actor: resolution.actor,
          reason: 'no-grant',
        },
      );
    }

    const { query } = permitted;

    if (
      !(await this.passesAccessQueries(
        context,
        ctx,
        permitted.resolution,
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

    if (!ctx.supports(ActorCtx)) {
      ctx.defineOverlay(ActorCtx, frozenActor(resolution.actor), {
        immutable: true,
      });
    }

    // Immutable: `assertFields` and the response filter trust it.
    ctx.defineOverlay(
      AccessDecisionCtx,
      { query, ability: permitted.resolution.ability },
      { immutable: true },
    );
    CHECKED.add(ctx);

    return true;
  }

  /**
   * The first grant, `any` before `own`, the actor holds under what the
   * authority allowed it, with the resolution it was checked against.
   */
  private permittedQuery(
    authorized: AccessAuthorizedGrantInterface[],
    possessions: PossessionEnum[],
  ):
    | { query: AccessQueryInterface; resolution: AccessResolutionInterface }
    | undefined {
    for (const { grant, resolution } of authorized) {
      for (const possession of possessions) {
        const action = `${grant.action}:${possession}`;

        if (!this.accessControl.refusal(resolution, action, grant.resource)) {
          return {
            query: {
              actor: resolution.actor,
              action: grant.action,
              possession,
              resource: grant.resource,
            },
            resolution,
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
