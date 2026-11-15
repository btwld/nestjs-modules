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

/**
 * An authority governing orders, as a repository it is attached to tells
 * it, whose rules may also name `invoices`.
 */
function governing(rules: CaslAuthorityRulesInterface): CaslAuthority {
  const authority = new CaslAuthority(rules, { subjects: ['invoices'] });
  authority.govern(ORDER_TOKEN, COLUMNS);
  return authority;
}

function decide(
  rules: Record<string, Rule[]>,
  action: ActionEnum,
  actor: Actor = CLERK,
  ctx: PlainLiteralObject = new AppContextHost(),
) {
  return governing(new RulesFixture(rules)).decide(ctx, {
    actor,
    subject: ORDER_TOKEN,
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

  it("should give a pending deny's gate as the decision still pending", async () => {
    await expect(
      decide(
        {
          'role:clerk': [
            { action: 'read', subject: ORDER_TOKEN },
            {
              action: 'read',
              subject: ORDER_TOKEN,
              inverted: true,
              pending: 'DEC-12',
            },
          ],
        },
        ActionEnum.READ,
      ),
    ).resolves.toEqual({ effect: 'refuse', gate: 'DEC-12' });
  });

  it("should report no gate for a final deny's reason", async () => {
    await expect(
      decide(
        {
          'role:clerk': [
            { action: 'read', subject: ORDER_TOKEN },
            {
              action: 'read',
              subject: ORDER_TOKEN,
              inverted: true,
              reason: 'orders are read by billing only',
            },
          ],
        },
        ActionEnum.READ,
      ),
    ).resolves.toEqual({ effect: 'refuse' });
  });

  it('should report a pending decision only when every deny that applies is one', async () => {
    const gated: Rule = {
      action: 'read',
      subject: ORDER_TOKEN,
      inverted: true,
      pending: 'DEC-12',
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
        { 'role:clerk': [allow, gated, { ...gated, pending: 'DEC-13' }] },
        ActionEnum.READ,
      ),
    ).resolves.toEqual({ effect: 'refuse', gate: 'DEC-12' });
  });

  it('should keep a pending column deny a narrowing, reporting its gate', async () => {
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
              pending: 'DEC-12',
            },
          ],
        },
        ActionEnum.READ,
      ),
    ).resolves.toEqual({
      effect: 'allow',
      columns: ['id', 'description', 'dateDeleted'],
      gates: { tenantId: 'DEC-12' },
    });
  });

  it('should report a column gate only when every deny on that column is pending', async () => {
    const pending: Rule = {
      action: 'update',
      subject: ORDER_TOKEN,
      fields: ['tenantId', 'description'],
      inverted: true,
      pending: 'DEC-12',
    };

    await expect(
      decide(
        {
          'role:clerk': [
            { action: 'update', subject: ORDER_TOKEN },
            pending,
            { ...pending, fields: ['description'], pending: undefined },
          ],
        },
        ActionEnum.UPDATE,
      ),
    ).resolves.toEqual({
      effect: 'allow',
      columns: ['id', 'dateDeleted'],
      gates: { tenantId: 'DEC-12' },
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
    const authority = governing(new RulesFixture(rules));
    const ctx = new AppContextHost();
    const request = {
      actor: CLERK,
      subject: ORDER_TOKEN,
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
      subject: ORDER_TOKEN,
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

  // A misspelled column in a deny would deny nothing.
  it('should refuse rules naming a column the entity lacks', async () => {
    const error = await decide(
      {
        'role:clerk': [
          { action: 'read', subject: ORDER_TOKEN },
          {
            action: 'read',
            subject: ORDER_TOKEN,
            fields: ['id', 'salry'],
            inverted: true,
          },
        ],
      },
      ActionEnum.READ,
    ).catch((e: unknown) => e);

    expect(error).toHaveProperty('context.problems', [
      `rules source rule 1: field "salry" is not a field of "${ORDER_TOKEN}"`,
    ]);
  });

  it('should match a column by its exact name only', async () => {
    const error = await decide(
      {
        'role:clerk': [
          { action: 'read', subject: ORDER_TOKEN, fields: ['date'] },
        ],
      },
      ActionEnum.READ,
    ).catch((e: unknown) => e);

    expect(error).toHaveProperty('context.problems', [
      `rules source rule 0: field "date" is not a field of "${ORDER_TOKEN}"`,
    ]);
  });

  // One rule may cover several entities with different columns.
  // On an entity lacking it, a deny of the column would deny nothing there.
  it('should refuse a column every entity a rule names does not have', () => {
    const authority = governing(new RulesFixture({}));
    authority.govern('line', ['id', 'description', 'quantity']);

    expect(
      authority.ruleProblems([
        {
          action: 'read',
          subject: [ORDER_TOKEN, 'line'],
          fields: ['description', 'quantity'],
          inverted: true,
        },
      ]),
    ).toEqual([
      `rules rule 0: field "quantity" is not a field of "${ORDER_TOKEN}"`,
    ]);
  });

  it('should accept a column every entity a rule names has', () => {
    const authority = governing(new RulesFixture({}));
    authority.govern('line', ['id', 'description', 'quantity']);

    expect(
      authority.ruleProblems([
        {
          action: 'read',
          subject: [ORDER_TOKEN, 'line'],
          fields: ['description'],
        },
      ]),
    ).toEqual([]);
  });

  // A subject declared, not governed, has no columns to check against.
  it('should accept any field on a declared subject', () => {
    expect(
      governing(new RulesFixture({})).ruleProblems([
        { action: 'read', subject: 'invoices', fields: ['anything'] },
      ]),
    ).toEqual([]);
  });

  // A declared subject beside it doesn't switch off the entity's check.
  it('should still check the fields of a governed entity named beside a declared subject', () => {
    expect(
      governing(new RulesFixture({})).ruleProblems([
        {
          action: 'read',
          subject: [ORDER_TOKEN, 'invoices'],
          fields: ['salry'],
          inverted: true,
        },
      ]),
    ).toEqual([
      `rules rule 0: field "salry" is not a field of "${ORDER_TOKEN}"`,
    ]);
  });

  it('should refuse every subject when it governs and declares none', () => {
    expect(
      new CaslAuthority(new RulesFixture({})).ruleProblems([
        { action: 'read', subject: ORDER_TOKEN },
      ]),
    ).toEqual([
      `rules rule 0: subject "${ORDER_TOKEN}" is not a known subject`,
    ]);
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
    const authority = governing(rules);
    const ctx = new AppContextHost();
    const request = { actor: CLERK, subject: ORDER_TOKEN, columns: COLUMNS };

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
    const authority = governing(rules);
    const ctx = new AppContextHost();
    const request = {
      subject: ORDER_TOKEN,
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
    // The repository told the authority which entity it governs.
    expect(
      moduleRef
        .get(CaslAuthority)
        .ruleProblems([{ action: 'read', subject: ORDER_TOKEN }]),
    ).toEqual([]);
  });

  describe('rulesFor', () => {
    const deny: Rule = {
      action: 'read',
      subject: ORDER_TOKEN,
      fields: ['tenantId'],
      inverted: true,
    };
    const allow: Rule = { action: 'read', subject: ORDER_TOKEN };

    it('should give the rules it decides by, denies last, from the same snapshot', async () => {
      const rules = new RulesFixture({ 'role:clerk': [deny, allow] });
      const authority = governing(rules);
      const ctx = new AppContextHost();

      await authority.decide(ctx, {
        actor: CLERK,
        subject: ORDER_TOKEN,
        action: ActionEnum.READ,
        columns: COLUMNS,
      });

      await expect(authority.rulesFor(ctx, CLERK)).resolves.toEqual([
        allow,
        deny,
      ]);
      expect(rules.calls).toEqual([CLERK]);
    });

    it('should give copies, so changing them changes no check', async () => {
      const authority = governing(
        new RulesFixture({ 'role:clerk': [allow, deny] }),
      );
      const ctx = new AppContextHost();

      const [, given] = await authority.rulesFor(ctx, CLERK);
      given?.fields?.push('description');

      await expect(
        authority.decide(ctx, {
          actor: CLERK,
          subject: ORDER_TOKEN,
          action: ActionEnum.READ,
          columns: COLUMNS,
        }),
      ).resolves.toEqual({
        effect: 'allow',
        columns: ['id', 'description', 'dateDeleted'],
      });
    });
  });

  // A misspelled deny would deny nothing, so a name the authority doesn't
  // know refuses the call, as a rule of the wrong shape does.
  describe('names a rule may use', () => {
    const DENY_TYPO: Rule = {
      action: 'read',
      subject: 'ordr',
      inverted: true,
    };

    it('should refuse rules naming a subject it neither governs nor declares', async () => {
      const error = await decide(
        {
          'role:clerk': [{ action: 'read', subject: ORDER_TOKEN }, DENY_TYPO],
        },
        ActionEnum.READ,
      ).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(CaslAuthorityRulesInvalidException);
      expect(error).toHaveProperty('context.problems', [
        'rules source rule 1: subject "ordr" is not a known subject',
      ]);
    });

    it('should refuse rules naming an action neither of the six nor declared', async () => {
      const error = await decide(
        {
          'role:clerk': [{ action: ['read', 'aprove'], subject: ORDER_TOKEN }],
        },
        ActionEnum.READ,
      ).catch((e: unknown) => e);

      expect(error).toHaveProperty('context.problems', [
        'rules source rule 0: action "aprove" is not a known action',
      ]);
    });

    it('should accept the subjects and actions it is given', async () => {
      const authority = new CaslAuthority(
        new RulesFixture({
          'role:clerk': [
            { action: ['read', 'approve'], subject: ['report', ORDER_TOKEN] },
          ],
        }),
        { subjects: ['report'], actions: ['approve'] },
      );
      authority.govern(ORDER_TOKEN, COLUMNS);

      await expect(
        authority.decide(new AppContextHost(), {
          actor: CLERK,
          subject: 'report',
          action: 'approve',
          columns: [],
        }),
      ).resolves.toEqual({ effect: 'allow' });
    });

    it('should list the same problems for rules checked before saving', () => {
      expect(
        governing(new RulesFixture({})).ruleProblems([DENY_TYPO], 'body'),
      ).toEqual(['body rule 0: subject "ordr" is not a known subject']);
    });
  });
});
