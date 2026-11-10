import { type ExecutionContext, type PlainLiteralObject } from '@nestjs/common';

import { AccessControlException } from '../exceptions/access-control.exception.js';
import { AccessRefusedException } from '../exceptions/access-refused.exception.js';
import { AccessRulesInvalidException } from '../exceptions/access-rules-invalid.exception.js';
import { type AccessActorResolverInterface } from '../interfaces/access-actor-resolver.interface.js';
import { type AccessActor } from '../interfaces/access-actor.type.js';
import { type AccessCheckOptionsInterface } from '../interfaces/access-check-options.interface.js';
import { type AccessDecisionSourceInterface } from '../interfaces/access-decision-source.interface.js';
import { type AccessGrantsProviderInterface } from '../interfaces/access-grants-provider.interface.js';
import { type AccessQueryInterface } from '../interfaces/access-query.interface.js';
import { type AccessRefusedDetailsInterface } from '../interfaces/access-refused-details.interface.js';
import { type AccessResolutionInterface } from '../interfaces/access-resolution.interface.js';
import { type AccessRuleInterface } from '../interfaces/access-rule.interface.js';
import { normalizeAccessFieldPath } from '../utils/access-field-paths.util.js';
import { accessRuleProblems } from '../utils/access-rule-problems.util.js';
import { createAccessAbility } from '../utils/create-access-ability.util.js';

function copyActor(actor: AccessActor): AccessActor {
  return actor.kind === 'role'
    ? { ...actor, roles: [...actor.roles] }
    : { ...actor };
}

/**
 * Answers whether the actor of a call may take an action on a resource.
 * The actor and their rules are resolved on every call, so a rule edited at
 * runtime applies to the next one.
 *
 * Actions are `<action>:<possession>`, such as `update:any`. Pass the
 * fields a write touches in `fields`: each is checked as well as the
 * resource, since CASL ignores a field's deny on a check without that field.
 * In a checked route's handler, `assertFields` checks them under the grant
 * the route let the caller in on.
 */
export class AccessControlService {
  constructor(
    private readonly actorResolver: AccessActorResolverInterface,
    private readonly grantsProvider: AccessGrantsProviderInterface,
    private readonly decisions?: AccessDecisionSourceInterface,
  ) {}

  /**
   * The actor of a call with their validated rules and ability, or
   * `undefined` when nobody is acting. `context` is passed to the actor
   * resolver on a checked route. Throws `AccessRulesInvalidException` when
   * the grants provider returns rules that cannot be used.
   */
  async resolve(
    ctx: PlainLiteralObject,
    context?: ExecutionContext,
  ): Promise<AccessResolutionInterface | undefined> {
    const actor = await this.actorResolver.actorFor(ctx, context);

    if (!actor) {
      return undefined;
    }

    const rules = await this.grantsProvider.rulesFor(ctx, actor);
    const problems = accessRuleProblems(rules, 'grants provider');

    if (problems.length) {
      throw new AccessRulesInvalidException(problems);
    }

    return { actor, rules, ability: createAccessAbility(rules) };
  }

  /**
   * Why a resolved actor may not take `action` on `subject`, or `undefined`
   * when they may. The resource is checked first, then each field. A field
   * above a denied one is refused too: writing `profile` as a whole, as
   * `{ profile: null }` does, replaces a denied `profile.ssn`.
   */
  refusal(
    resolution: Pick<AccessResolutionInterface, 'actor' | 'ability'>,
    action: string,
    subject: string,
    options: AccessCheckOptionsInterface = {},
  ): AccessRefusedDetailsInterface | undefined {
    const { actor, ability } = resolution;

    if (!ability.can(action, subject)) {
      return {
        action,
        subject,
        actor,
        reason: ability.relevantRuleFor(action, subject)?.inverted
          ? 'denied'
          : 'no-grant',
      };
    }

    const fields = (options.fields ?? []).map(normalizeAccessFieldPath);

    if (!fields.length) {
      return undefined;
    }

    // Every rule for the action, field-scoped denies included: `rulesFor`
    // leaves those out when asked without a field.
    const deniedFields = ability
      .possibleRulesFor(action, subject)
      .filter((rule) => rule.inverted)
      .flatMap((rule) => rule.fields ?? []);

    for (const field of fields) {
      if (
        !ability.can(action, subject, field) ||
        deniedFields.some((denied) => denied.startsWith(`${field}.`))
      ) {
        return { action, subject, actor, reason: 'field', field };
      }
    }

    return undefined;
  }

  async can(
    ctx: PlainLiteralObject,
    action: string,
    subject: string,
    options?: AccessCheckOptionsInterface,
  ): Promise<boolean> {
    const resolution = await this.resolve(ctx);

    return !!resolution && !this.refusal(resolution, action, subject, options);
  }

  /**
   * Throws `AccessRefusedException` unless the actor may take `action` on
   * `subject`, and on each field in `fields`.
   */
  async assert(
    ctx: PlainLiteralObject,
    action: string,
    subject: string,
    options?: AccessCheckOptionsInterface,
  ): Promise<void> {
    const resolution = await this.resolve(ctx);

    if (!resolution) {
      throw new AccessRefusedException({ action, subject, reason: 'no-actor' });
    }

    const refusal = this.refusal(resolution, action, subject, options);

    if (refusal) {
      throw new AccessRefusedException(refusal);
    }
  }

  /**
   * In the handler of a checked route, throws `AccessRefusedException`
   * unless the actor may write each field in `fields`, under the grant the
   * route let them through on: a caller who got in on `update:own` is
   * checked against `update:own`, one on `update:any` against
   * `update:any`. Uses the route's decision, so the rules are not resolved
   * again.
   *
   * Throws `AccessControlException` when the call passed no route check.
   */
  async assertFields(
    ctx: PlainLiteralObject,
    fields: readonly string[],
  ): Promise<void> {
    const decision = this.decisions?.decisionFor(ctx);

    if (!decision) {
      throw new AccessControlException({
        message:
          'assertFields needs a call let through by a route grant; use assert elsewhere',
        fault: 'usage',
      });
    }

    const { query, ability } = decision;
    const refusal = this.refusal(
      { actor: query.actor, ability },
      `${query.action}:${query.possession}`,
      query.resource,
      { fields: [...fields] },
    );

    if (refusal) {
      throw new AccessRefusedException(refusal);
    }
  }

  /**
   * The grant a checked route let the call through on: who is acting, the
   * action and resource the route declared, and whether `any` or `own`
   * allowed it. `undefined` when the call passed no route check.
   *
   * A handler serving both, such as a list, branches on `possession`.
   */
  decision(ctx: PlainLiteralObject): AccessQueryInterface | undefined {
    const query = this.decisions?.decisionFor(ctx)?.query;

    // Copied, actor included, so changing the result changes no check.
    return query && { ...query, actor: copyActor(query.actor) };
  }

  /**
   * The actor's rules, denies last, for a UI to show what they may do.
   * Empty when nobody is acting.
   */
  async effectiveRules(
    ctx: PlainLiteralObject,
  ): Promise<AccessRuleInterface[]> {
    const resolution = await this.resolve(ctx);

    return resolution
      ? [
          ...resolution.rules.filter((rule) => !rule.inverted),
          ...resolution.rules.filter((rule) => rule.inverted),
        ]
      : [];
  }
}
