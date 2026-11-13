import { Module, type PlainLiteralObject } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import {
  ActionEnum,
  type Actor,
  AppContextHost,
  type AuthorityRuleInterface,
  CoreModule,
} from '@concepta/nestjs-core';

import { actorCtx } from '../../__fixtures__/memory/authority.fixture.js';
import { type MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import {
  ORDER_TOKEN,
  OrderEntityFixture,
  type OrderFixture,
} from '../../__fixtures__/memory/order.fixture.js';
import { AuthorityRefusedException } from '../../authority/exceptions/authority-refused.exception.js';
import { RepositoryModule } from '../../repository.module.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';
import { CaslAuthority } from '../casl-authority.js';
import { CaslAuthorityRulesInvalidException } from '../exceptions/casl-authority-rules-invalid.exception.js';
import { type CaslAuthorityRulesInterface } from '../interfaces/casl-authority-rules.interface.js';

/** Rules as stored, so they may name actions of the application's own. */
type Rule = AuthorityRuleInterface<string>;

const COLUMNS = ['id', 'tenantId', 'description', 'dateDeleted'];
const CLERK: Actor = { kind: 'role', roles: ['clerk'] };

/** Rules keyed by actor key, as an application might store them. */
class RulesFixture implements CaslAuthorityRulesInterface {
  readonly calls: Actor[] = [];

  constructor(private readonly byKey: Record<string, Rule[]>) {}

  rulesFor(_ctx: PlainLiteralObject, actor: Actor): Rule[] {
    this.calls.push(actor);
    const keys =
      actor.kind === 'system'
        ? [`system:${actor.name}`]
        : actor.roles.map((role) => `role:${role}`);
    return keys.flatMap((key) => this.byKey[key] ?? []);
  }
}

function decide(
  rules: Record<string, Rule[]>,
  action: ActionEnum,
  actor: Actor = CLERK,
  ctx: PlainLiteralObject = new AppContextHost(),
) {
  return new CaslAuthority(new RulesFixture(rules)).decide(ctx, {
    actor,
    object: ORDER_TOKEN,
    action,
    columns: COLUMNS,
  });
}

describe(CaslAuthority.name, () => {
  it('should allow every column when a rule names none', async () => {
    await expect(
      decide(
        { 'role:clerk': [{ action: 'read', subject: ORDER_TOKEN }] },
        ActionEnum.READ,
      ),
    ).resolves.toEqual({ effect: 'allow' });
  });

  it('should refuse when no rule allows', async () => {
    await expect(
      decide(
        { 'role:clerk': [{ action: 'read', subject: 'invoices' }] },
        ActionEnum.READ,
      ),
    ).resolves.toEqual({ effect: 'refuse' });
  });

  it('should allow only the columns a rule names', async () => {
    await expect(
      decide(
        {
          'role:clerk': [
            {
              action: 'update',
              subject: ORDER_TOKEN,
              fields: ['description'],
            },
          ],
        },
        ActionEnum.UPDATE,
      ),
    ).resolves.toEqual({ effect: 'allow', columns: ['description'] });
  });

  it('should allow every column but those a deny names', async () => {
    await expect(
      decide(
        {
          'role:clerk': [
            { action: 'read', subject: ORDER_TOKEN },
            {
              action: 'read',
              subject: ORDER_TOKEN,
              fields: ['tenantId'],
              inverted: true,
            },
          ],
        },
        ActionEnum.READ,
      ),
    ).resolves.toEqual({
      effect: 'allow',
      columns: ['id', 'description', 'dateDeleted'],
    });
  });

  it('should let a deny win whatever order the rules come in', async () => {
    await expect(
      decide(
        {
          'role:temp': [
            { action: 'delete', subject: ORDER_TOKEN, inverted: true },
          ],
          'role:clerk': [{ action: 'delete', subject: ORDER_TOKEN }],
        },
        ActionEnum.DELETE,
        { kind: 'role', roles: ['temp', 'clerk'] },
      ),
    ).resolves.toEqual({ effect: 'refuse' });
  });

  it("should give a deny's reason as the decision still pending", async () => {
    await expect(
      decide(
        {
          'role:clerk': [
            { action: 'read', subject: ORDER_TOKEN },
            {
              action: 'read',
              subject: ORDER_TOKEN,
              inverted: true,
              reason: 'DEC-12',
            },
          ],
        },
        ActionEnum.READ,
      ),
    ).resolves.toEqual({ effect: 'refuse', gate: 'DEC-12' });
  });

  it('should report a pending decision only when every deny that applies is one', async () => {
    const gated: Rule = {
      action: 'read',
      subject: ORDER_TOKEN,
      inverted: true,
      reason: 'DEC-12',
    };
    const final: Rule = {
      action: 'read',
      subject: ORDER_TOKEN,
      inverted: true,
    };
    const allow: Rule = { action: 'read', subject: ORDER_TOKEN };

    for (const rules of [
      [allow, gated, final],
      [allow, final, gated],
    ]) {
      await expect(
        decide({ 'role:clerk': rules }, ActionEnum.READ),
      ).resolves.toEqual({ effect: 'refuse' });
    }
    await expect(
      decide(
        { 'role:clerk': [allow, gated, { ...gated, reason: 'DEC-13' }] },
        ActionEnum.READ,
      ),
    ).resolves.toEqual({ effect: 'refuse', gate: 'DEC-12' });
  });

  it('should keep a column deny a narrowing, never a refusal of the object', async () => {
    await expect(
      decide(
        {
          'role:clerk': [
            { action: 'read', subject: ORDER_TOKEN },
            {
              action: 'read',
              subject: ORDER_TOKEN,
              fields: ['tenantId'],
              inverted: true,
              reason: 'DEC-12',
            },
          ],
        },
        ActionEnum.READ,
      ),
    ).resolves.toEqual({
      effect: 'allow',
      columns: ['id', 'description', 'dateDeleted'],
    });
  });

  it.each<{ name: string; rules: Record<string, Rule[]> }>([
    {
      name: 'a rule with an empty field list',
      rules: {
        'role:clerk': [{ action: 'read', subject: ORDER_TOKEN, fields: [] }],
      },
    },
    {
      name: 'a field pattern',
      rules: {
        'role:clerk': [
          { action: 'read', subject: ORDER_TOKEN, fields: ['date*'] },
        ],
      },
    },
    {
      name: "CASL's `manage` wildcard",
      rules: { 'role:clerk': [{ action: 'manage', subject: ORDER_TOKEN }] },
    },
    {
      name: "CASL's `all` wildcard",
      rules: { 'role:clerk': [{ action: 'read', subject: 'all' }] },
    },
    {
      name: 'a rule with conditions',
      // Stored rules arrive as parsed JSON, whatever their shape.
      rules: JSON.parse(
        `{"role:clerk":[{"action":"read","subject":"${ORDER_TOKEN}","conditions":{"tenantId":"acme"}}]}`,
      ),
    },
  ])('should refuse every call on the ctx for $name', async ({ rules }) => {
    const authority = new CaslAuthority(new RulesFixture(rules));
    const ctx = new AppContextHost();
    const request = {
      actor: CLERK,
      object: ORDER_TOKEN,
      action: ActionEnum.READ,
      columns: COLUMNS,
    };

    await expect(authority.decide(ctx, request)).rejects.toThrow(
      CaslAuthorityRulesInvalidException,
    );
    await expect(authority.decide(ctx, request)).rejects.toThrow(
      CaslAuthorityRulesInvalidException,
    );
  });

  it('should refuse every call on the ctx when the rules cannot be read', async () => {
    let calls = 0;
    const authority = new CaslAuthority({
      rulesFor: async () => {
        calls += 1;
        throw new Error('rules store unavailable');
      },
    });
    const ctx = new AppContextHost();
    const request = {
      actor: CLERK,
      object: ORDER_TOKEN,
      action: ActionEnum.READ,
      columns: COLUMNS,
    };

    await expect(authority.decide(ctx, request)).rejects.toThrow(
      'rules store unavailable',
    );
    await expect(authority.decide(ctx, request)).rejects.toThrow(
      'rules store unavailable',
    );
    expect(calls).toBe(1);
  });

  it('should ignore columns a rule names that the object lacks', async () => {
    await expect(
      decide(
        {
          'role:clerk': [
            {
              action: 'read',
              subject: ORDER_TOKEN,
              fields: ['id', 'salary'],
            },
          ],
        },
        ActionEnum.READ,
      ),
    ).resolves.toEqual({ effect: 'allow', columns: ['id'] });
  });

  it('should match a column by its exact name only', async () => {
    await expect(
      decide(
        {
          'role:clerk': [
            { action: 'read', subject: ORDER_TOKEN, fields: ['date'] },
          ],
        },
        ActionEnum.READ,
      ),
    ).resolves.toEqual({ effect: 'allow', columns: [] });
  });

  it('should decide a system by its own rules', async () => {
    await expect(
      decide(
        { 'system:billing': [{ action: 'read', subject: ORDER_TOKEN }] },
        ActionEnum.READ,
        { kind: 'system', name: 'billing' },
      ),
    ).resolves.toEqual({ effect: 'allow' });
  });

  it('should ask for the rules once per ctx, so every check in a call agrees', async () => {
    const rules = new RulesFixture({
      'role:clerk': [{ action: ['read', 'update'], subject: ORDER_TOKEN }],
    });
    const authority = new CaslAuthority(rules);
    const ctx = new AppContextHost();
    const request = { actor: CLERK, object: ORDER_TOKEN, columns: COLUMNS };

    await authority.decide(ctx, { ...request, action: ActionEnum.READ });
    await authority.decide(ctx, { ...request, action: ActionEnum.UPDATE });
    await authority.decide(new AppContextHost(), {
      ...request,
      action: ActionEnum.READ,
    });

    expect(rules.calls).toEqual([CLERK, CLERK]);
  });

  it('should never answer one actor from the rules of another on the same ctx', async () => {
    const rules = new RulesFixture({
      'role:admin': [{ action: 'read', subject: ORDER_TOKEN }],
    });
    const authority = new CaslAuthority(rules);
    const ctx = new AppContextHost();
    const request = {
      object: ORDER_TOKEN,
      action: ActionEnum.READ,
      columns: COLUMNS,
    };

    await expect(
      authority.decide(ctx, {
        ...request,
        actor: { kind: 'role', roles: ['admin'] },
      }),
    ).resolves.toEqual({ effect: 'allow' });
    await expect(
      authority.decide(ctx, { ...request, actor: CLERK }),
    ).resolves.toEqual({ effect: 'refuse' });
  });

  it('should govern a repository end to end', async () => {
    const rules = new RulesFixture({
      'role:admin': [{ action: ['create', 'read'], subject: ORDER_TOKEN }],
      'role:clerk': [
        { action: 'read', subject: ORDER_TOKEN },
        {
          action: 'read',
          subject: ORDER_TOKEN,
          fields: ['tenantId'],
          inverted: true,
        },
      ],
    });

    @Module({
      providers: [
        { provide: CaslAuthority, useValue: new CaslAuthority(rules) },
      ],
      exports: [CaslAuthority],
    })
    class AuthorityModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot({}),
        RepositoryModule.forRoot({
          imports: [AuthorityModule],
          drivers: [
            {
              driver: MemoryRepositoryModuleFixture,
              entities: [
                {
                  key: ORDER_TOKEN,
                  entity: OrderEntityFixture,
                  authority: { access: 'governed', authority: CaslAuthority },
                },
              ],
            },
          ],
        }),
      ],
    }).compile();
    const orders = moduleRef.get<MemoryRepositoryFixture<OrderFixture>>(
      getDynamicRepositoryToken(ORDER_TOKEN),
    );
    const order: OrderFixture = {
      id: 'order-1',
      tenantId: 'acme',
      description: 'first',
      dateDeleted: null,
    };
    await orders.create(order, {
      ctx: actorCtx({ kind: 'role', roles: ['admin'] }),
    });

    await expect(orders.find({ ctx: actorCtx(CLERK) })).resolves.toEqual([
      { id: 'order-1', description: 'first', dateDeleted: null },
    ]);
    await expect(
      orders.create({ ...order, id: 'order-2' }, { ctx: actorCtx(CLERK) }),
    ).rejects.toThrow(AuthorityRefusedException);
  });
});
