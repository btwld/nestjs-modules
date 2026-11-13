import { type ExecutionContext, type PlainLiteralObject } from '@nestjs/common';

import {
  type Actor,
  type AuthorityInterface,
  type AuthorityRuleInterface,
  authorityRuleProblems,
} from '@concepta/nestjs-core';

import { AccessControlException } from '../exceptions/access-control.exception.js';
import { AccessRefusedException } from '../exceptions/access-refused.exception.js';
import { AccessRulesInvalidException } from '../exceptions/access-rules-invalid.exception.js';
import { type AccessActorResolverInterface } from '../interfaces/access-actor-resolver.interface.js';
import { type AccessAuthorization } from '../interfaces/access-authorization.type.js';
import { type AccessCheckOptionsInterface } from '../interfaces/access-check-options.interface.js';
import { type AccessDecisionSourceInterface } from '../interfaces/access-decision-source.interface.js';
import { type AccessGrantsProviderInterface } from '../interfaces/access-grants-provider.interface.js';
import { type AccessQueryInterface } from '../interfaces/access-query.interface.js';
import { type AccessRefusedDetailsInterface } from '../interfaces/access-refused-details.interface.js';
import { type AccessResolutionInterface } from '../interfaces/access-resolution.interface.js';
import { normalizeAccessFieldPath } from '../utils/access-field-paths.util.js';
import { accessGateOf } from '../utils/access-gate.util.js';
import { createAccessAbility } from '../utils/create-access-ability.util.js';

/**
 * The actor's rules that can only narrow what an authority allowed: their
 * denies. Their allows are left out, since nothing the authority did not
 * allow may be allowed here.
 */
function narrowingRules(
  rules: readonly AuthorityRuleInterface<string>[],
): AuthorityRuleInterface<string>[] {
  return rules.filter((rule) => rule.inverted);
}

/** `actor` with exactly the properties its kind has, in a fixed order. */
function normalizedActor(actor: Actor): Actor {
  if (actor.kind === 'system') {
    return { kind: 'system', name: actor.name };
  }

  return {
    kind: 'role',
    roles: [...actor.roles],
    ...(actor.userId === undefined ? {} : { userId: actor.userId }),
  };
}

function copyActor(actor: Actor): Actor {
  return actor.kind === 'role'
    ? { ...actor, roles: [...actor.roles] }
    : { ...actor };
}

/**
 * Answers whether the actor of a call may take an action on a resource.
 * The actor and their rules are resolved on every call, so a rule edited at
 * runtime applies to the next one.
 *
 * Actions are verbs, such as `update` or `approve`. Pass the fields a write
 * touches in `fields`: each is checked as well as the resource, since CASL
 * ignores a field's deny on a check without that field. In a checked
 * route's handler, `assertFields` checks them under the grant the route let
 * the caller in on.
 */
export class AccessControlService {
  constructor(
    private readonly actorResolver: AccessActorResolverInterface,
    private readonly grantsProvider: AccessGrantsProviderInterface,
    private readonly decisions?: AccessDecisionSourceInterface,
    private readonly authority?: AuthorityInterface,
  ) {}

  /**
   * What the module's authority answers for `action` on `subject`, the
   * resource read as the authority's object.
   *
   * Without an authority, `resolution` as it is: the actor's rules decide.
   * With one, a refusal is final; an allow becomes the actor's allow of
   * `action` on `subject`, beside `read` when the authority lets the actor
   * read it too, since a write's response shows what a read would. The
   * actor's own rules then narrow it — by denying, since a deny always
   * wins — and can never allow more.
   */
  async authorize(
    ctx: PlainLiteralObject,
    resolution: AccessResolutionInterface,
    action: string,
    subject: string,
  ): Promise<AccessAuthorization> {
    const { authority } = this;
    if (!authority) {
      return { allowed: true, resolution };
    }

    // The shape a repository asks about, so both share one snapshot.
    const actor = normalizedActor(resolution.actor);
    const decide = (asked: string) =>
      authority.decide(ctx, {
        actor,
        object: subject,
        action: asked,
        columns: [],
      });

    const decision = await decide(action);
    if (decision.effect !== 'allow') {
      return {
        allowed: false,
        refusal: {
          action,
          subject,
          actor,
          reason: 'authority',
          ...(decision.gate === undefined ? {} : { gate: decision.gate }),
        },
      };
    }

    const reads =
      action !== 'read' && (await decide('read')).effect === 'allow';
    const rules: AuthorityRuleInterface<string>[] = [
      ...narrowingRules(resolution.rules),
      { action: reads ? [action, 'read'] : action, subject },
    ];

    return {
      allowed: true,
      resolution: {
        actor: resolution.actor,
        rules,
        ability: createAccessAbility(rules),
      },
    };
  }

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
    const problems = authorityRuleProblems(rules, 'grants provider');

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
      if (!ability.relevantRuleFor(action, subject)?.inverted) {
        return { action, subject, actor, reason: 'no-grant' };
      }

      const gate = accessGateOf(ability, action, subject);
      return {
        action,
        subject,
        actor,
        reason: 'denied',
        ...(gate === undefined ? {} : { gate }),
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
    if (!resolution) return false;

    const authorized = await this.authorize(ctx, resolution, action, subject);

    return (
      authorized.allowed &&
      !this.refusal(authorized.resolution, action, subject, options)
    );
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

    const authorized = await this.authorize(ctx, resolution, action, subject);
    if (!authorized.allowed) {
      throw new AccessRefusedException(authorized.refusal);
    }

    const refusal = this.refusal(
      authorized.resolution,
      action,
      subject,
      options,
    );

    if (refusal) {
      throw new AccessRefusedException(refusal);
    }
  }

  /**
   * In the handler of a checked route, throws `AccessRefusedException`
   * unless the actor may write each field in `fields`, under the grant the
   * route let them through on. Uses the route's decision, so the rules are
   * not resolved again.
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
      query.action,
      query.resource,
      { fields: [...fields] },
    );

    if (refusal) {
      throw new AccessRefusedException(refusal);
    }
  }

  /**
   * The grant a checked route let the call through on: who is acting, and
   * the action and resource the route declared. `undefined` when the call
   * passed no route check.
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
  ): Promise<AuthorityRuleInterface<string>[]> {
    const resolution = await this.resolve(ctx);

    return resolution
      ? [
          ...resolution.rules.filter((rule) => !rule.inverted),
          ...resolution.rules.filter((rule) => rule.inverted),
        ]
      : [];
  }
}
