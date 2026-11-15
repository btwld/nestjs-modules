import { type PlainLiteralObject } from '@nestjs/common';

import {
  type Actor,
  type AuthorityInterface,
  type AuthorityRuleInterface,
  type RoleActorInterface,
} from '@concepta/nestjs-core';
import {
  CaslAuthority,
  CaslAuthorityRulesInvalidException,
} from '@concepta/nestjs-repository/optional/casl';

import { StaticAccessGrantsProvider } from '../../../infrastructure/grants/static-access-grants.provider.js';
import { AccessControlException } from '../../exceptions/access-control.exception.js';
import { AccessRefusedException } from '../../exceptions/access-refused.exception.js';
import { AccessRulesInvalidException } from '../../exceptions/access-rules-invalid.exception.js';
import { type AccessActorResolverInterface } from '../../interfaces/access-actor-resolver.interface.js';
import { type AccessDecisionSourceInterface } from '../../interfaces/access-decision-source.interface.js';
import { type AccessGrantsProviderInterface } from '../../interfaces/access-grants-provider.interface.js';
import { type AccessGrants } from '../../interfaces/access-grants.type.js';
import { createAccessAbility } from '../../utils/create-access-ability.util.js';
import { AccessControlService } from '../access-control.service.js';

describe(AccessControlService.name, () => {
  const actingAs = (actor?: Actor): AccessActorResolverInterface => ({
    actorFor: async () => actor,
  });

  const serviceFor = (actor: Actor | undefined, grants: AccessGrants) =>
    new AccessControlService(
      actingAs(actor),
      new StaticAccessGrantsProvider(grants),
    );

  const clerk: Actor = { kind: 'role', roles: ['clerk'] };

  describe('assert', () => {
    it('refuses when nobody is acting', async () => {
      await expect(
        serviceFor(undefined, {}).assert({}, 'read', 'user'),
      ).rejects.toThrow(
        expect.objectContaining({
          constructor: AccessRefusedException,
          context: expect.objectContaining({
            action: 'read',
            resource: 'user',
            refusal: 'no-actor',
          }),
        }),
      );
    });

    it('refuses an actor with no grant, naming them', async () => {
      await expect(
        serviceFor(clerk, {}).assert({}, 'read', 'user'),
      ).rejects.toThrow(
        expect.objectContaining({
          context: expect.objectContaining({
            refusal: 'no-grant',
            actor: clerk,
          }),
        }),
      );
    });

    it('names the actor by who they are only, whatever the resolver added', async () => {
      const resolved: RoleActorInterface & { email: string } = {
        kind: 'role',
        roles: ['clerk'],
        userId: 'user-1',
        email: 'clerk@example.com',
      };

      const error = await serviceFor(resolved, {})
        .assert({}, 'read', 'user')
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(AccessRefusedException);
      expect(
        error instanceof AccessRefusedException && error.context.actor,
      ).toEqual({ kind: 'role', roles: ['clerk'], userId: 'user-1' });
    });

    it('allows what a role grants', async () => {
      await expect(
        serviceFor(clerk, {
          'role:clerk': [{ action: 'read', subject: 'user' }],
        }).assert({}, 'read', 'user'),
      ).resolves.toBeUndefined();
    });

    it('lets a deny on one role win over another role allowing it', async () => {
      const service = serviceFor(
        { kind: 'role', roles: ['clerk', 'admin'] },
        {
          'role:clerk': [{ action: 'delete', subject: 'user', inverted: true }],
          'role:admin': [{ action: 'delete', subject: 'user' }],
        },
      );

      await expect(service.assert({}, 'delete', 'user')).rejects.toThrow(
        expect.objectContaining({
          context: expect.objectContaining({ refusal: 'denied' }),
        }),
      );
    });

    it('hides a field one role denies from the user, whatever another role grants', async () => {
      const service = serviceFor(
        { kind: 'role', roles: ['a', 'b'] },
        {
          'role:a': [
            { action: 'read', subject: 'user' },
            {
              action: 'read',
              subject: 'user',
              fields: ['salary'],
              inverted: true,
            },
          ],
          'role:b': [{ action: 'read', subject: 'user' }],
        },
      );

      await expect(
        service.assert({}, 'read', 'user', { fields: ['salary'] }),
      ).rejects.toThrow(
        expect.objectContaining({
          context: expect.objectContaining({
            refusal: 'field',
            fields: ['salary'],
          }),
        }),
      );
    });

    it('refuses a write touching a denied field', async () => {
      const service = serviceFor(clerk, {
        'role:clerk': [
          { action: 'update', subject: 'contract' },
          {
            action: 'update',
            subject: 'contract',
            fields: ['amount'],
            inverted: true,
          },
        ],
      });

      await expect(
        service.assert({}, 'update', 'contract', { fields: ['notes'] }),
      ).resolves.toBeUndefined();
      await expect(
        service.assert({}, 'update', 'contract', {
          fields: ['notes', 'amount'],
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          context: expect.objectContaining({
            refusal: 'field',
            fields: ['amount'],
          }),
        }),
      );
    });
  });

  const decisionRules: AuthorityRuleInterface<string>[] = [
    { action: ['update', 'approve'], subject: 'document' },
    {
      action: 'update',
      subject: 'document',
      fields: ['ownerId'],
      inverted: true,
    },
  ];

  const decidedOn = (action: string): AccessDecisionSourceInterface => ({
    decisionFor: () => ({
      query: {
        actor: clerk,
        action,
        resource: 'document',
      },
      ability: createAccessAbility(decisionRules),
    }),
  });

  const serviceDeciding = (
    decisions: AccessDecisionSourceInterface,
    rulesFor = vi.fn<AccessGrantsProviderInterface['rulesFor']>(),
  ) => new AccessControlService(actingAs(clerk), { rulesFor }, decisions);

  describe('decision', () => {
    it('names the grant the route let the call through on', () => {
      expect(serviceDeciding(decidedOn('update')).decision({})).toEqual({
        actor: clerk,
        action: 'update',
        resource: 'document',
      });
    });

    it('returns a copy, so changing it changes no later check', () => {
      const actor: Actor = { kind: 'role', roles: ['clerk'] };
      const service = serviceDeciding({
        decisionFor: () => ({
          query: {
            actor,
            action: 'update',
            resource: 'document',
          },
          ability: createAccessAbility(decisionRules),
        }),
      });
      const decided = service.decision({});

      // The type says readonly; a caller may still try.
      if (decided?.actor.kind === 'role') {
        Array.prototype.push.call(decided.actor.roles, 'admin');
      }

      expect(actor).toEqual({ kind: 'role', roles: ['clerk'] });
    });

    it('returns a copy of a system actor too', () => {
      const actor: Actor = { kind: 'system', name: 'billing' };
      const service = serviceDeciding({
        decisionFor: () => ({
          query: { actor, action: 'update', resource: 'document' },
          ability: createAccessAbility(decisionRules),
        }),
      });
      const decided = service.decision({});

      expect(decided?.actor).toEqual(actor);
      expect(decided?.actor).not.toBe(actor);
    });

    it('is undefined for a call that passed no route check', () => {
      expect(
        serviceDeciding({ decisionFor: () => undefined }).decision({}),
      ).toBeUndefined();
      expect(serviceFor(clerk, {}).decision({})).toBeUndefined();
    });
  });

  describe('assertFields', () => {
    it('checks the fields under the action the route let the call through on', async () => {
      await expect(
        serviceDeciding(decidedOn('approve')).assertFields({}, ['ownerId']),
      ).resolves.toBeUndefined();
      await expect(
        serviceDeciding(decidedOn('update')).assertFields({}, ['ownerId']),
      ).rejects.toThrow(
        expect.objectContaining({
          constructor: AccessRefusedException,
          context: expect.objectContaining({
            action: 'update',
            resource: 'document',
            actor: clerk,
            refusal: 'field',
            fields: ['ownerId'],
          }),
        }),
      );
    });

    it('allows fields no rule denies', async () => {
      await expect(
        serviceDeciding(decidedOn('update')).assertFields({}, [
          'title',
          'tags.3.label',
        ]),
      ).resolves.toBeUndefined();
    });

    it('reuses the route decision, never resolving the rules again', async () => {
      const rulesFor = vi.fn<AccessGrantsProviderInterface['rulesFor']>();

      await serviceDeciding(decidedOn('update'), rulesFor).assertFields({}, [
        'title',
      ]);

      expect(rulesFor).not.toHaveBeenCalled();
    });

    it('refuses a call that passed no route check', async () => {
      await expect(
        serviceDeciding({ decisionFor: () => undefined }).assertFields({}, [
          'title',
        ]),
      ).rejects.toThrow(
        expect.objectContaining({
          constructor: AccessControlException,
          fault: 'usage',
        }),
      );
      await expect(
        serviceFor(clerk, {}).assertFields({}, ['title']),
      ).rejects.toThrow(AccessControlException);
    });
  });

  describe('can', () => {
    it('answers false when nobody is acting', async () => {
      expect(await serviceFor(undefined, {}).can({}, 'read', 'user')).toBe(
        false,
      );
    });
  });

  // Off a checked route there is no execution context, on any transport.
  describe('the actor resolver, asked outside a route check', () => {
    const asked = () => {
      const calls: unknown[][] = [];
      const service = new AccessControlService(
        {
          actorFor: async (...args) => {
            calls.push(args);
            return clerk;
          },
        },
        new StaticAccessGrantsProvider({
          'role:clerk': [{ action: 'read', subject: 'invoice' }],
        }),
      );
      return { calls, service };
    };

    it.each([
      [
        'can',
        (s: AccessControlService, ctx: PlainLiteralObject) =>
          s.can(ctx, 'read', 'invoice'),
      ],
      [
        'assert',
        (s: AccessControlService, ctx: PlainLiteralObject) =>
          s.assert(ctx, 'read', 'invoice'),
      ],
      [
        'effectiveRules',
        (s: AccessControlService, ctx: PlainLiteralObject) =>
          s.effectiveRules(ctx),
      ],
    ])(
      'is asked by %s with the ctx and no execution context',
      async (_name, check) => {
        const { calls, service } = asked();
        const ctx = {};

        await check(service, ctx);

        expect(calls).toHaveLength(1);
        expect(calls[0][0]).toBe(ctx);
        expect(calls[0][1]).toBeUndefined();
      },
    );
  });

  // Grants accept any verb, since routes may declare their own, so a typo
  // is a verb of its own: it fails silently rather than being refused.
  describe('a mistyped verb in grants', () => {
    it('grants nothing when an allow misspells it', async () => {
      const service = serviceFor(clerk, {
        'role:clerk': [{ action: 'raed', subject: 'invoice' }],
      });

      expect(await service.can({}, 'read', 'invoice')).toBe(false);
    });

    it('denies nothing when a deny misspells it', async () => {
      const service = serviceFor(clerk, {
        'role:clerk': [
          { action: 'read', subject: 'invoice' },
          { action: 'raed', subject: 'invoice', inverted: true },
        ],
      });

      expect(await service.can({}, 'read', 'invoice')).toBe(true);
    });
  });

  describe('systems', () => {
    const grants: AccessGrants = {
      'system:agile': [{ action: 'approve', subject: 'contract' }],
      'role:agile': [
        { action: 'approve', subject: 'contract', inverted: true },
      ],
      'role:clerk': [{ action: 'export', subject: 'statement' }],
    };

    it('allows a system where a role of the same name is refused', async () => {
      expect(
        await serviceFor({ kind: 'system', name: 'agile' }, grants).can(
          {},
          'approve',
          'contract',
        ),
      ).toEqual(true);
      expect(
        await serviceFor({ kind: 'role', roles: ['agile'] }, grants).can(
          {},
          'approve',
          'contract',
        ),
      ).toEqual(false);
    });

    it('allows a role where a system has no grant', async () => {
      expect(
        await serviceFor(clerk, grants).can({}, 'export', 'statement'),
      ).toEqual(true);
      expect(
        await serviceFor({ kind: 'system', name: 'agile' }, grants).can(
          {},
          'export',
          'statement',
        ),
      ).toEqual(false);
    });
  });

  describe('per-user rules from a grants provider', () => {
    const template: AuthorityRuleInterface<string>[] = [
      { action: 'read', subject: 'invoice' },
      { action: 'void', subject: 'invoice', inverted: true },
    ];

    const provider = (
      userRules: AuthorityRuleInterface<string>[],
    ): AccessGrantsProviderInterface => ({
      rulesFor: async () => [...template, ...userRules],
    });

    const user: Actor = { kind: 'role', roles: ['clerk'], userId: 'u1' };

    it('lets a user rule remove what the template allows', async () => {
      const service = new AccessControlService(
        actingAs(user),
        provider([{ action: 'read', subject: 'invoice', inverted: true }]),
      );

      expect(await service.can({}, 'read', 'invoice')).toEqual(false);
    });

    it('never lets a user rule override a template deny', async () => {
      const service = new AccessControlService(
        actingAs(user),
        provider([{ action: 'void', subject: 'invoice' }]),
      );

      expect(await service.can({}, 'void', 'invoice')).toEqual(false);
    });

    it('asks the provider on every call, with the ctx and actor', async () => {
      const rulesFor = vi
        .fn<AccessGrantsProviderInterface['rulesFor']>()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ action: 'read', subject: 'invoice' }]);
      const ctx: PlainLiteralObject = {};
      const service = new AccessControlService(actingAs(user), { rulesFor });

      expect(await service.can(ctx, 'read', 'invoice')).toEqual(false);
      expect(await service.can(ctx, 'read', 'invoice')).toEqual(true);
      expect(rulesFor).toHaveBeenCalledWith(ctx, user);
    });

    it('refuses rules a provider returns that cannot be used', async () => {
      const service = new AccessControlService(actingAs(user), {
        rulesFor: async () => [{ action: 'manage', subject: 'all' }],
      });

      await expect(service.can({}, 'read', 'invoice')).rejects.toThrow(
        AccessRulesInvalidException,
      );
    });
  });

  describe('effectiveRules', () => {
    it('returns the actor rules, denies last', async () => {
      const service = serviceFor(
        { kind: 'role', roles: ['a', 'b'] },
        {
          'role:a': [{ action: 'void', subject: 'invoice', inverted: true }],
          'role:b': [{ action: 'read', subject: 'invoice' }],
        },
      );

      expect(await service.effectiveRules({})).toEqual([
        { action: 'read', subject: 'invoice' },
        { action: 'void', subject: 'invoice', inverted: true },
      ]);
    });

    it('is empty when nobody is acting', async () => {
      expect(await serviceFor(undefined, {}).effectiveRules({})).toEqual([]);
    });
  });

  describe('with an authority', () => {
    /** Allows `<verb> <subject>` keys, refusing the rest. */
    const authorityAllowing = (
      ...allowed: string[]
    ): AuthorityInterface & { requests: unknown[] } => {
      const requests: unknown[] = [];
      return {
        requests,
        decide: async (_ctx, request) => {
          requests.push(request);
          if (allowed.includes(`${request.action} ${request.subject}`)) {
            return { effect: 'allow' };
          }
          return request.subject === 'gated'
            ? { effect: 'refuse', gate: 'DEC-4' }
            : { effect: 'refuse' };
        },
      };
    };

    const governedService = (
      authority: AuthorityInterface,
      grants: AccessGrants = {},
    ) =>
      new AccessControlService(
        actingAs(clerk),
        new StaticAccessGrantsProvider(grants),
        undefined,
        { authority, except: ['report'] },
      );

    it('refuses a resource the authority has no rule for, unless it is left out', async () => {
      const service = governedService(authorityAllowing('read invoice'), {
        'role:clerk': [{ action: 'read', subject: 'invoices' }],
      });

      await expect(service.assert({}, 'read', 'invoices')).rejects.toThrow(
        expect.objectContaining({
          context: expect.objectContaining({ refusal: 'authority' }),
        }),
      );
    });

    it('decides a resource the authority leaves out by the actor’s rules alone, never asking it', async () => {
      const authority = authorityAllowing('read invoice');
      const decide = vi.spyOn(authority, 'decide');
      const service = governedService(authority, {
        'role:clerk': [{ action: 'export', subject: 'report' }],
      });

      expect(await service.can({}, 'export', 'report')).toEqual(true);
      expect(await service.can({}, 'delete', 'report')).toEqual(false);
      expect(decide).not.toHaveBeenCalled();
    });

    it('lets the authority decide when the actor has no rule of their own', async () => {
      const service = governedService(authorityAllowing('read invoice'));

      expect(await service.can({}, 'read', 'invoice')).toEqual(true);
      expect(await service.can({}, 'update', 'invoice')).toEqual(false);
    });

    it('asks the authority for the verb, on the resource as its subject', async () => {
      const authority = authorityAllowing('read invoice');
      const ctx = {};

      await governedService(authority).can(ctx, 'read', 'invoice');

      expect(authority.requests).toEqual([
        { actor: clerk, subject: 'invoice', action: 'read', columns: [] },
      ]);
    });

    // A resolver may hand over an actor carrying more than its kind has.
    const withExtra = (actor: Actor): Actor =>
      Object.assign({ note: 'extra' }, actor);

    it.each<{ kind: string; actor: Actor; asked: Actor }>([
      {
        kind: 'a system',
        actor: withExtra({ kind: 'system', name: 'billing' }),
        asked: { kind: 'system', name: 'billing' },
      },
      {
        kind: 'a signed-in',
        actor: withExtra({ kind: 'role', roles: ['clerk'], userId: 'user-7' }),
        asked: { kind: 'role', roles: ['clerk'], userId: 'user-7' },
      },
    ])(
      'asks about $kind actor in the shape a repository asks about',
      async ({ actor, asked }) => {
        const authority = authorityAllowing('read invoice');
        const service = new AccessControlService(
          { actorFor: async () => actor },
          new StaticAccessGrantsProvider({}),
          undefined,
          { authority },
        );

        await service.can({}, 'read', 'invoice');

        expect(authority.requests).toEqual([
          { actor: asked, subject: 'invoice', action: 'read', columns: [] },
        ]);
      },
    );

    it('refuses what the authority refuses, naming any pending decision', async () => {
      const error = await governedService(authorityAllowing())
        .assert({}, 'read', 'gated')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AccessRefusedException);
      expect(error).toMatchObject({
        context: { refusal: 'authority', gate: 'DEC-4', resource: 'gated' },
      });
    });

    it('never lets a rule of its own allow what the authority refuses', async () => {
      const service = governedService(authorityAllowing('read invoice'), {
        'role:clerk': [{ action: 'delete', subject: 'invoice' }],
      });

      expect(await service.can({}, 'delete', 'invoice')).toEqual(false);
    });

    it('narrows with a deny: a field the actor may not write', async () => {
      const service = governedService(authorityAllowing('update invoice'), {
        'role:clerk': [
          {
            action: 'update',
            subject: 'invoice',
            fields: ['amount'],
            inverted: true,
          },
        ],
      });

      expect(
        await service.can({}, 'update', 'invoice', { fields: ['notes'] }),
      ).toEqual(true);
      expect(
        await service.can({}, 'update', 'invoice', { fields: ['amount'] }),
      ).toEqual(false);
    });

    it('lets a write read what the authority lets the actor read', async () => {
      const service = governedService(
        authorityAllowing('update invoice', 'read invoice'),
      );
      const resolution = await service.resolve({});
      if (!resolution) throw new Error('nobody acting');

      const authorized = await service.authorize(
        {},
        resolution,
        'update',
        'invoice',
      );

      expect(authorized).toEqual({
        allowed: true,
        resolution: expect.objectContaining({
          rules: [{ action: ['update', 'read'], subject: 'invoice' }],
        }),
      });
    });

    it('does not let a write read what the authority does not let the actor read', async () => {
      const service = governedService(authorityAllowing('update invoice'));
      const resolution = await service.resolve({});
      if (!resolution) throw new Error('nobody acting');

      const authorized = await service.authorize(
        {},
        resolution,
        'update',
        'invoice',
      );

      expect(authorized).toEqual({
        allowed: true,
        resolution: expect.objectContaining({
          rules: [{ action: 'update', subject: 'invoice' }],
        }),
      });
    });

    it('keeps none of the actor’s own allows for what the authority did not allow', async () => {
      const service = governedService(authorityAllowing('update invoice'), {
        'role:clerk': [
          { action: 'read', subject: 'invoice' },
          {
            action: ['delete', 'update'],
            subject: ['invoice', 'payment'],
          },
          { action: 'read', subject: 'payment' },
        ],
      });
      const resolution = await service.resolve({});
      if (!resolution) throw new Error('nobody acting');

      const authorized = await service.authorize(
        {},
        resolution,
        'update',
        'invoice',
      );
      if (!authorized.allowed) throw new Error('refused');
      const { ability } = authorized.resolution;

      expect(ability.can('update', 'invoice')).toEqual(true);
      expect(ability.can('read', 'invoice')).toEqual(false);
      expect(ability.can('delete', 'invoice')).toEqual(false);
      expect(ability.can('update', 'payment')).toEqual(false);
      expect(ability.can('read', 'payment')).toEqual(false);
    });

    it('keeps every one of the actor’s own denies', async () => {
      const service = governedService(authorityAllowing('update invoice'), {
        'role:clerk': [
          { action: 'update', subject: 'invoice', inverted: true },
        ],
      });
      const resolution = await service.resolve({});
      if (!resolution) throw new Error('nobody acting');

      const authorized = await service.authorize(
        {},
        resolution,
        'update',
        'invoice',
      );
      if (!authorized.allowed) throw new Error('refused');

      expect(authorized.resolution.ability.can('update', 'invoice')).toEqual(
        false,
      );
    });

    it('asks the authority about the same actor the repository does', async () => {
      const authority = authorityAllowing('read invoice');
      const service = new AccessControlService(
        actingAs({
          roles: ['clerk'],
          kind: 'role',
          userId: undefined,
        }),
        new StaticAccessGrantsProvider({}),
        undefined,
        { authority },
      );

      await service.can({}, 'read', 'invoice');

      expect(authority.requests).toStrictEqual([
        {
          actor: { kind: 'role', roles: ['clerk'] },
          subject: 'invoice',
          action: 'read',
          columns: [],
        },
      ]);
    });

    it('leaves a service with no authority deciding by its rules alone', async () => {
      const service = serviceFor(clerk, {});
      const resolution = await service.resolve({});
      if (!resolution) throw new Error('nobody acting');

      expect(
        await service.authorize({}, resolution, 'read', 'invoice'),
      ).toEqual({ allowed: true, resolution });
    });

    // An authority that gives no rules decides per call, so a UI shown these
    // rules may offer what a check then refuses.
    it('shows the actor’s own rules only under an authority giving none', async () => {
      const authority = authorityAllowing('read invoice', 'update invoice');
      const service = governedService(authority, {
        'role:clerk': [{ action: 'read', subject: 'report' }],
      });

      expect(await service.effectiveRules({})).toEqual([
        { action: 'read', subject: 'report' },
      ]);
      expect(authority.requests).toEqual([]);
    });

    describe('effectiveRules under an authority giving its rules', () => {
      const authorityRules: AuthorityRuleInterface<string>[] = [
        { action: ['read', 'update'], subject: ['invoice', 'report'] },
        {
          action: 'update',
          subject: 'invoice',
          fields: ['total'],
          inverted: true,
        },
      ];
      const giving: AuthorityInterface = {
        decide: async () => ({ effect: 'refuse' }),
        rulesFor: async () => authorityRules,
      };

      it('combines them as they decide, denies last', async () => {
        const service = governedService(giving, {
          'role:clerk': [
            // Outside `except` an allow of the actor's grants nothing...
            { action: 'delete', subject: 'invoice' },
            // ...and a deny narrows what the authority allows.
            {
              action: 'read',
              subject: 'invoice',
              fields: ['notes'],
              inverted: true,
            },
            // On `report`, in `except`, the actor's rules decide alone.
            { action: 'export', subject: 'report' },
          ],
        });

        expect(await service.effectiveRules({})).toEqual([
          { action: ['read', 'update'], subject: ['invoice'] },
          { action: 'export', subject: 'report' },
          {
            action: 'update',
            subject: 'invoice',
            fields: ['total'],
            inverted: true,
          },
          {
            action: 'read',
            subject: 'invoice',
            fields: ['notes'],
            inverted: true,
          },
        ]);
      });

      // A gate stays in the logs: the caller is shown what decides, never why.
      it('shows neither a gate nor a reason, the authority’s or the actor’s', async () => {
        const service = governedService(
          {
            ...giving,
            rulesFor: async () => [
              { action: 'read', subject: 'invoice' },
              {
                action: 'void',
                subject: 'invoice',
                inverted: true,
                pending: 'FIN-12',
                reason: 'until finance signs off',
              },
            ],
          },
          {
            'role:clerk': [
              {
                action: 'read',
                subject: 'invoice',
                fields: ['notes'],
                inverted: true,
                reason: 'notes are internal',
              },
            ],
          },
        );

        expect(await service.effectiveRules({})).toEqual([
          { action: 'read', subject: 'invoice' },
          { action: 'void', subject: 'invoice', inverted: true },
          {
            action: 'read',
            subject: 'invoice',
            fields: ['notes'],
            inverted: true,
          },
        ]);
      });

      it('gives copies, so changing them changes no stored grant', async () => {
        const stored: AuthorityRuleInterface<string>[] = [
          {
            action: ['read'],
            subject: ['report'],
            fields: ['total'],
            inverted: true,
          },
        ];
        const service = serviceFor(clerk, { 'role:clerk': stored });

        const [shown] = await service.effectiveRules({});
        if (!shown || !Array.isArray(shown.action)) throw new Error('none');
        shown.action.push('update');
        shown.fields?.push('notes');

        expect(stored).toEqual([
          {
            action: ['read'],
            subject: ['report'],
            fields: ['total'],
            inverted: true,
          },
        ]);
      });

      it('asks the authority about the actor acting on the call', async () => {
        const rulesFor = vi.fn(async () => authorityRules);
        const service = governedService({ ...giving, rulesFor });

        await service.effectiveRules({});

        expect(rulesFor).toHaveBeenCalledWith({}, clerk);
      });
    });

    describe('shared with the repository as a CaslAuthority', () => {
      const sharedService = (rules: AuthorityRuleInterface<string>[]) =>
        new AccessControlService(
          actingAs(clerk),
          new StaticAccessGrantsProvider({}),
          undefined,
          {
            // No repository here to tell it what it governs.
            authority: new CaslAuthority(
              { rulesFor: async () => rules },
              { subjects: ['invoice'] },
            ),
          },
        );

      // Fields are checked against access control's own denies; the
      // authority's column rules hold where data passes the repository.
      it('checks fields against its own denies only, not the authority’s column rules', async () => {
        const service = sharedService([
          { action: 'read', subject: 'invoice' },
          {
            action: 'read',
            subject: 'invoice',
            fields: ['internalNotes'],
            inverted: true,
          },
        ]);

        expect(
          await service.can({}, 'read', 'invoice', {
            fields: ['internalNotes'],
          }),
        ).toBe(true);
      });

      it('fails on the authority’s unusable rules with its own exception', async () => {
        const service = sharedService([
          { action: 'read', subject: 'invoice', fields: [] },
        ]);

        await expect(service.assert({}, 'read', 'invoice')).rejects.toThrow(
          CaslAuthorityRulesInvalidException,
        );
      });
    });
  });

  describe('refusal', () => {
    const service = serviceFor(undefined, {});

    const refusalOf = (
      rules: AuthorityRuleInterface<string>[],
      action: string,
      subject: string,
      fields?: string[],
    ) => {
      const refusal = service.refusal(
        { actor: clerk, ability: createAccessAbility(rules) },
        action,
        subject,
        { fields },
      );
      return refusal && { refusal: refusal.refusal, fields: refusal.fields };
    };

    it('names the action, resource and actor', () => {
      expect(
        service.refusal(
          { actor: clerk, ability: createAccessAbility([]) },
          'read',
          'user',
        ),
      ).toEqual({
        action: 'read',
        resource: 'user',
        actor: clerk,
        refusal: 'no-grant',
      });
    });

    it('names the actor by who they are only, whatever the resolver added', () => {
      const resolved: RoleActorInterface & { email: string } = {
        kind: 'role',
        roles: ['clerk'],
        email: 'clerk@example.com',
      };

      expect(
        service.refusal(
          { actor: resolved, ability: createAccessAbility([]) },
          'read',
          'user',
        )?.actor,
      ).toStrictEqual({ kind: 'role', roles: ['clerk'] });
    });

    it('allows what a rule grants', () => {
      const rules = [{ action: 'read', subject: 'user' }];

      expect(refusalOf(rules, 'read', 'user')).toBeUndefined();
      expect(refusalOf(rules, 'read', 'org')).toEqual({
        refusal: 'no-grant',
        fields: undefined,
      });
    });

    describe('gate', () => {
      const refusalUnder = (rules: AuthorityRuleInterface<string>[]) =>
        service.refusal(
          { actor: clerk, ability: createAccessAbility(rules) },
          'approve',
          'contract',
        );

      it('reports the gate of the pending deny that refused', () => {
        expect(
          refusalUnder([
            { action: 'approve', subject: 'contract' },
            {
              action: 'approve',
              subject: 'contract',
              inverted: true,
              pending: 'DEC-7',
            },
          ]),
        ).toEqual({
          action: 'approve',
          resource: 'contract',
          actor: clerk,
          refusal: 'denied',
          gate: 'DEC-7',
        });
      });

      it('reports the first gate given when every deny that applies is pending', () => {
        expect(
          refusalUnder([
            { action: 'approve', subject: 'contract' },
            {
              action: 'approve',
              subject: 'contract',
              inverted: true,
              pending: 'DEC-7',
            },
            {
              action: 'approve',
              subject: 'contract',
              inverted: true,
              pending: 'DEC-8',
            },
          ]),
        ).toEqual({
          action: 'approve',
          resource: 'contract',
          actor: clerk,
          refusal: 'denied',
          gate: 'DEC-7',
        });
      });

      it('reports no gate when a deny that applies is final, its reason included', () => {
        expect(
          refusalUnder([
            {
              action: 'approve',
              subject: 'contract',
              inverted: true,
              pending: 'DEC-7',
            },
            {
              action: 'approve',
              subject: 'contract',
              inverted: true,
              reason: 'contracts are approved by legal only',
            },
          ]),
        ).toEqual({
          action: 'approve',
          resource: 'contract',
          actor: clerk,
          refusal: 'denied',
        });
      });

      it('leaves denies naming fields out of the gate', () => {
        const rules: AuthorityRuleInterface<string>[] = [
          { action: 'approve', subject: 'contract' },
          {
            action: 'approve',
            subject: 'contract',
            inverted: true,
            pending: 'DEC-7',
          },
          {
            action: 'approve',
            subject: 'contract',
            fields: ['amount'],
            inverted: true,
          },
        ];

        expect(refusalUnder(rules)).toEqual({
          action: 'approve',
          resource: 'contract',
          actor: clerk,
          refusal: 'denied',
          gate: 'DEC-7',
        });
      });

      describe('on a field', () => {
        const fieldRefusal = (
          rules: AuthorityRuleInterface<string>[],
          field: string,
        ) =>
          service.refusal(
            { actor: clerk, ability: createAccessAbility(rules) },
            'approve',
            'contract',
            { fields: [field] },
          );
        const pendingAmount: AuthorityRuleInterface<string> = {
          action: 'approve',
          subject: 'contract',
          fields: ['terms.amount'],
          inverted: true,
          pending: 'DEC-7',
        };

        it('reports the gate of the pending deny that refused the field', () => {
          expect(
            fieldRefusal(
              [{ action: 'approve', subject: 'contract' }, pendingAmount],
              'terms.amount',
            ),
          ).toEqual({
            action: 'approve',
            resource: 'contract',
            actor: clerk,
            refusal: 'field',
            fields: ['terms.amount'],
            gate: 'DEC-7',
          });
        });

        // Writing `terms` as a whole replaces the pending `terms.amount`.
        it('reports the gate of a pending deny beneath the field', () => {
          expect(
            fieldRefusal(
              [{ action: 'approve', subject: 'contract' }, pendingAmount],
              'terms',
            ),
          ).toEqual({
            action: 'approve',
            resource: 'contract',
            actor: clerk,
            refusal: 'field',
            fields: ['terms'],
            gate: 'DEC-7',
          });
        });

        // Closing the field's own gate would still leave the final deny
        // beneath it refusing a write of the whole field.
        it('reports no gate when a deny beneath the field is final', () => {
          expect(
            fieldRefusal(
              [
                { action: 'approve', subject: 'contract' },
                { ...pendingAmount, fields: ['terms'] },
                {
                  action: 'approve',
                  subject: 'contract',
                  fields: ['terms.amount'],
                  inverted: true,
                },
              ],
              'terms',
            ),
          ).toEqual({
            action: 'approve',
            resource: 'contract',
            actor: clerk,
            refusal: 'field',
            fields: ['terms'],
          });
        });

        it('reports no gate when a deny on the field is final', () => {
          expect(
            fieldRefusal(
              [
                { action: 'approve', subject: 'contract' },
                pendingAmount,
                {
                  action: 'approve',
                  subject: 'contract',
                  fields: ['terms.amount'],
                  inverted: true,
                },
              ],
              'terms.amount',
            ),
          ).toEqual({
            action: 'approve',
            resource: 'contract',
            actor: clerk,
            refusal: 'field',
            fields: ['terms.amount'],
          });
        });

        it('reports no gate for a field no rule allows', () => {
          expect(
            fieldRefusal(
              [
                {
                  action: 'approve',
                  subject: 'contract',
                  fields: ['notes'],
                },
              ],
              'terms',
            ),
          ).toEqual({
            action: 'approve',
            resource: 'contract',
            actor: clerk,
            refusal: 'field',
            fields: ['terms'],
          });
        });
      });
    });

    describe('fields', () => {
      const rules: AuthorityRuleInterface<string>[] = [
        { action: 'update', subject: 'user' },
        {
          action: 'update',
          subject: 'user',
          fields: ['role', 'items.amount', 'address'],
          inverted: true,
        },
      ];

      it('allows the resource without fields, whatever its field denies', () => {
        expect(refusalOf(rules, 'update', 'user')).toBeUndefined();
      });

      it('refuses a denied field the call names', () => {
        expect(refusalOf(rules, 'update', 'user', ['name', 'role'])).toEqual({
          refusal: 'field',
          fields: ['role'],
        });
      });

      it('refuses a denied field inside an array, whatever its position', () => {
        expect(refusalOf(rules, 'update', 'user', ['items.3.amount'])).toEqual({
          refusal: 'field',
          fields: ['items.amount'],
        });
      });

      it('refuses a field beneath a denied parent', () => {
        expect(refusalOf(rules, 'update', 'user', ['address.city'])).toEqual({
          refusal: 'field',
          fields: ['address.city'],
        });
      });

      // Writing `items` as a whole, as `{ items: null }` does, replaces
      // every field beneath it.
      it('refuses a field above a denied field', () => {
        expect(refusalOf(rules, 'update', 'user', ['items'])).toEqual({
          refusal: 'field',
          fields: ['items'],
        });
      });

      it('allows a field whose name only starts like a denied one', () => {
        expect(
          refusalOf(rules, 'update', 'user', ['item', 'roles']),
        ).toBeUndefined();
      });

      it('refuses a numeric top-level key to an allow naming fields', () => {
        const limited = [
          { action: 'update', subject: 'user', fields: ['name'] },
        ];

        expect(refusalOf(limited, 'update', 'user', ['0'])).toEqual({
          refusal: 'field',
          fields: ['0'],
        });
        expect(
          refusalOf([{ action: 'update', subject: 'user' }], 'update', 'user', [
            '0',
          ]),
        ).toBeUndefined();
      });

      it('allows fields no deny covers', () => {
        expect(
          refusalOf(rules, 'update', 'user', ['name', 'items.3.label']),
        ).toBeUndefined();
      });

      it('allows only the fields an allow names', () => {
        const limited = [
          {
            action: 'update',
            subject: 'user',
            fields: ['name', 'profile'],
          },
        ];

        expect(
          refusalOf(limited, 'update', 'user', ['name', 'profile.bio']),
        ).toBeUndefined();
        expect(refusalOf(limited, 'update', 'user', ['email'])).toEqual({
          refusal: 'field',
          fields: ['email'],
        });
      });
    });
  });
});
