import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import {
  type Actor,
  ActorCtx,
  actorKeys,
  AppContextHost,
  type AuthorityRuleInterface,
} from '@concepta/nestjs-core';
import {
  InjectDynamicRepository,
  type RepositoryInterface,
  Where,
} from '@concepta/nestjs-repository';
import { type CaslAuthorityRulesInterface } from '@concepta/nestjs-repository/optional/casl';

import { type StoredRuleEntity } from './stored-rule.entity.js';

export const DOCUMENT = 'document';
export const RULE = 'rule';

/**
 * Rules that cannot live in the table they govern: who may edit the rules,
 * and the system that reads them.
 */
const FIXED_RULES: Record<string, AuthorityRuleInterface[]> = {
  'role:admin': [{ action: ['create', 'read', 'delete'], subject: RULE }],
  'system:authority': [{ action: 'read', subject: RULE }],
};

/**
 * Every actor's rules, from the `stored_rule` table, plus the fixed ones.
 *
 * The table is governed too, so it is read as the `authority` system — on a
 * ctx of its own, whose rules are fixed — rather than as the caller, who may
 * not read it.
 */
@Injectable()
export class StoredRules implements CaslAuthorityRulesInterface {
  constructor(
    @InjectDynamicRepository(RULE)
    private readonly rules: RepositoryInterface<StoredRuleEntity>,
  ) {}

  async rulesFor(
    _ctx: PlainLiteralObject,
    actor: Actor,
  ): Promise<AuthorityRuleInterface<string>[]> {
    const keys = actorKeys(actor);
    const fixed = keys.flatMap((key) => FIXED_RULES[key] ?? []);
    if (actor.kind === 'system' && actor.name === 'authority') return fixed;

    const ctx = new AppContextHost();
    ctx.defineOverlay(
      ActorCtx,
      { kind: 'system', name: 'authority' },
      { immutable: true },
    );
    const stored = keys.length
      ? await this.rules.find({ where: Where.in('actorKey', keys), ctx })
      : [];

    return [
      ...fixed,
      ...stored.map(
        ({ action, subject, fields, inverted, pending, reason }) => ({
          action,
          subject,
          inverted,
          ...(fields ? { fields } : {}),
          ...(pending ? { pending } : {}),
          ...(reason ? { reason } : {}),
        }),
      ),
    ];
  }
}
