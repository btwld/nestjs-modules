import { Ability } from '@casl/ability';
import { permittedFieldsOf } from '@casl/ability/extra';

import { type PlainLiteralObject } from '@nestjs/common';

import {
  ActionEnum,
  type Actor,
  type AuthorityDecision,
  type AuthorityInterface,
  type AuthorityRequestInterface,
  authorityGateOf,
  authorityRuleProblems,
} from '@concepta/nestjs-core';

import { CaslAuthorityRulesInvalidException } from './exceptions/casl-authority-rules-invalid.exception.js';
import { type CaslAuthorityOptionsInterface } from './interfaces/casl-authority-options.interface.js';
import { type CaslAuthorityRulesInterface } from './interfaces/casl-authority-rules.interface.js';

type CaslAuthorityAbility = Ability<[string, string]>;

/**
 * The gate of a refusal of `action` on `subject`, or of one of its columns,
 * read from the rules as written: CASL keeps each as its `origin`.
 */
function gateOf(
  ability: CaslAuthorityAbility,
  action: string,
  subject: string,
  column?: string,
): string | undefined {
  return authorityGateOf(
    ability.rulesFor(action, subject, column).map((rule) => rule.origin),
  );
}

/**
 * An authority answering from rules (`AuthorityRuleInterface`), which
 * `rules` supplies for each actor, decided by CASL.
 *
 * - A deny always wins, whatever order the rules come in.
 * - A rule naming `fields` covers those columns only, by exact name; one
 *   naming none covers every column.
 * - Rules are checked before use (`ruleProblems`): rules with a problem
 *   refuse the call, as does every other call on the same ctx. A rule may
 *   name only an entity this authority governs, which each repository it
 *   is attached to tells it at startup with its columns, or a subject in
 *   `options.subjects`; only one of the six actions a repository asks, or a
 *   verb in `options.actions`; and only fields that are a column of every
 *   governed entity the rule names. A misspelled deny would otherwise deny
 *   nothing.
 * - When every deny that refuses the call is `pending`, the first one's
 *   gate is reported as the refusal's `gate`. A deny naming columns narrows
 *   them instead; when every deny refusing a column is pending, its gate is
 *   reported in the decision's `gates`. A deny that isn't pending is final.
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

  /** The entities it was attached to at startup, with their columns. */
  private readonly governed = new Map<string, readonly string[]>();

  constructor(
    private readonly rules: CaslAuthorityRulesInterface,
    private readonly options: CaslAuthorityOptionsInterface = {},
  ) {}

  govern(subject: string, columns: readonly string[]): void {
    this.governed.set(subject, [...columns]);
  }

  /**
   * Every problem with `rules` as this authority would find it: those
   * `authorityRuleProblems` lists, and any subject that is neither an entity
   * it governs nor one of `subjects`, action that is neither one of the six
   * nor one of `actions`, or field that isn't a column of each governed
   * entity a rule names. Check stored rules with it before saving them.
   */
  ruleProblems(rules: unknown, source = 'rules'): string[] {
    return authorityRuleProblems(rules, source, {
      subjects: [...this.governed.keys(), ...(this.options.subjects ?? [])],
      actions: [...Object.values(ActionEnum), ...(this.options.actions ?? [])],
      fields: this.governed,
    });
  }

  async decide(
    ctx: PlainLiteralObject,
    { actor, subject, action, columns }: AuthorityRequestInterface,
  ): Promise<AuthorityDecision> {
    const ability = await this.abilityFor(ctx, actor);

    if (!ability.can(action, subject)) {
      // With no field, CASL gives the rules of the whole subject only.
      const gate = gateOf(ability, action, subject);
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

    // A column is left out by a deny naming it, or by no allow covering it;
    // only the first can be pending.
    const gates = Object.fromEntries(
      columns
        .filter((column) => !permitted.has(column))
        .flatMap((column) => {
          const gate = gateOf(ability, action, subject, column);
          return gate === undefined ? [] : [[column, gate]];
        }),
    );

    return {
      effect: 'allow',
      columns: columns.filter((column) => permitted.has(column)),
      ...(Object.keys(gates).length ? { gates } : {}),
    };
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
    const problems = this.ruleProblems(rules, 'rules source');
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
