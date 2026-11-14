import { Ability } from '@casl/ability';
import { permittedFieldsOf } from '@casl/ability/extra';

import { type PlainLiteralObject } from '@nestjs/common';

import {
  type Actor,
  type AuthorityDecision,
  type AuthorityInterface,
  type AuthorityRequestInterface,
  authorityRuleProblems,
} from '@concepta/nestjs-core';

import { CaslAuthorityRulesInvalidException } from './exceptions/casl-authority-rules-invalid.exception.js';
import { type CaslAuthorityRulesInterface } from './interfaces/casl-authority-rules.interface.js';

type CaslAuthorityAbility = Ability<[string, string]>;

/**
 * An authority answering from rules (`AuthorityRuleInterface`), which
 * `rules` supplies for each actor, decided by CASL.
 *
 * - A deny always wins, whatever order the rules come in.
 * - A rule naming `fields` covers those columns only, by exact name; one
 *   naming none covers every column.
 * - Rules are checked before use (`authorityRuleProblems`): one with
 *   `conditions`, an unknown property, or CASL's wildcards `manage` and
 *   `all` refuses the call, as does every other call on the same ctx.
 * - A deny's `reason` is reported as the decision still pending (`gate`)
 *   when the deny refuses the subject outright and every other deny that
 *   applies has one too. A deny naming `fields` narrows the columns instead,
 *   and its `reason` is not reported.
 */
export class CaslAuthority implements AuthorityInterface {
  /**
   * One ability per ctx and actor, so every check in a call reads the same
   * rules.
   */
  private readonly abilities = new WeakMap<
    object,
    Map<string, Promise<CaslAuthorityAbility>>
  >();

  constructor(private readonly rules: CaslAuthorityRulesInterface) {}

  async decide(
    ctx: PlainLiteralObject,
    { actor, subject, action, columns }: AuthorityRequestInterface,
  ): Promise<AuthorityDecision> {
    const ability = await this.abilityFor(ctx, actor);

    if (!ability.can(action, subject)) {
      const gate = this.gateOf(ability, action, subject);
      return gate === undefined
        ? { effect: 'refuse' }
        : { effect: 'refuse', gate };
    }

    const permitted = new Set(
      permittedFieldsOf(ability, action, subject, {
        fieldsFrom: (rule) => rule.fields ?? [...columns],
      }),
    );
    if (columns.every((column) => permitted.has(column))) {
      return { effect: 'allow' };
    }

    return {
      effect: 'allow',
      columns: columns.filter((column) => permitted.has(column)),
    };
  }

  /**
   * The decision still pending behind a refusal: the first `reason` among the
   * denies that apply, in the order they were given, but only when every one
   * of them has one. A deny without a reason is final, so a refusal it takes
   * part in is never reported as pending, whatever order the rules come in.
   * No rule at all is a refusal with nothing pending.
   */
  private gateOf(
    ability: CaslAuthorityAbility,
    action: string,
    subject: string,
  ): string | undefined {
    // Highest priority first, so the first given is last.
    const reasons = ability
      .rulesFor(action, subject)
      .filter((rule) => rule.inverted)
      .map((rule) => rule.reason);

    return reasons.every((reason) => reason !== undefined)
      ? reasons.at(-1)
      : undefined;
  }

  private abilityFor(
    ctx: PlainLiteralObject,
    actor: Actor,
  ): Promise<CaslAuthorityAbility> {
    const byActor =
      this.abilities.get(ctx) ??
      new Map<string, Promise<CaslAuthorityAbility>>();
    this.abilities.set(ctx, byActor);

    const key = JSON.stringify(actor);
    let ability = byActor.get(key);
    if (!ability) {
      ability = this.createAbility(ctx, actor);
      byActor.set(key, ability);
    }
    return ability;
  }

  private async createAbility(
    ctx: PlainLiteralObject,
    actor: Actor,
  ): Promise<CaslAuthorityAbility> {
    const rules = await this.rules.rulesFor(ctx, actor);
    const problems = authorityRuleProblems(rules, 'rules source');
    if (problems.length > 0) {
      throw new CaslAuthorityRulesInvalidException(problems);
    }

    // CASL lets the last matching rule decide, so every deny goes last.
    // CASL needs a field matcher for rules that name columns, although
    // columns are only ever read from the rules, never matched.
    return new Ability<[string, string]>(
      [
        ...rules.filter((rule) => !rule.inverted),
        ...rules.filter((rule) => rule.inverted),
      ],
      { fieldMatcher: (fields) => (field) => fields.includes(field) },
    );
  }
}
