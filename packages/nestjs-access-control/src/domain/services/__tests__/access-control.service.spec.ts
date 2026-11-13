import { type PlainLiteralObject } from '@nestjs/common';

import {
  type Actor,
  type AuthorityInterface,
  type AuthorityRuleInterface,
} from '@concepta/nestjs-core';

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
            subject: 'user',
            reason: 'no-actor',
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
            reason: 'no-grant',
            actor: clerk,
          }),
        }),
      );
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
          context: expect.objectContaining({ reason: 'denied' }),
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
            reason: 'field',
            field: 'salary',
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
            reason: 'field',
            field: 'amount',
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
            subject: 'document',
            actor: clerk,
            reason: 'field',
            field: 'ownerId',
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
    /** Allows `<verb> <object>` keys, refusing the rest. */
    const authorityAllowing = (
      ...allowed: string[]
    ): AuthorityInterface & { requests: unknown[] } => {
      const requests: unknown[] = [];
      return {
        requests,
        decide: async (_ctx, request) => {
          requests.push(request);
          if (allowed.includes(`${request.action} ${request.object}`)) {
            return { effect: 'allow' };
          }
          return request.object === 'gated'
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
        authority,
      );

    it('lets the authority decide when the actor has no rule of their own', async () => {
      const service = governedService(authorityAllowing('read invoice'));

      expect(await service.can({}, 'read', 'invoice')).toEqual(true);
      expect(await service.can({}, 'update', 'invoice')).toEqual(false);
    });

    it('asks the authority for the verb, on the resource as its object', async () => {
      const authority = authorityAllowing('read invoice');
      const ctx = {};

      await governedService(authority).can(ctx, 'read', 'invoice');

      expect(authority.requests).toEqual([
        { actor: clerk, object: 'invoice', action: 'read', columns: [] },
      ]);
    });

    it('refuses what the authority refuses, naming any pending decision', async () => {
      const error = await governedService(authorityAllowing())
        .assert({}, 'read', 'gated')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AccessRefusedException);
      expect(error).toMatchObject({
        context: { reason: 'authority', gate: 'DEC-4', subject: 'gated' },
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
        authority,
      );

      await service.can({}, 'read', 'invoice');

      expect(authority.requests).toStrictEqual([
        {
          actor: { kind: 'role', roles: ['clerk'] },
          object: 'invoice',
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
      return refusal && { reason: refusal.reason, field: refusal.field };
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
        subject: 'user',
        actor: clerk,
        reason: 'no-grant',
      });
    });

    it('allows what a rule grants', () => {
      const rules = [{ action: 'read', subject: 'user' }];

      expect(refusalOf(rules, 'read', 'user')).toBeUndefined();
      expect(refusalOf(rules, 'read', 'org')).toEqual({
        reason: 'no-grant',
        field: undefined,
      });
    });

    describe('gate', () => {
      const refusalUnder = (rules: AuthorityRuleInterface<string>[]) =>
        service.refusal(
          { actor: clerk, ability: createAccessAbility(rules) },
          'approve',
          'contract',
        );

      it('reports the reason of the deny that refused as the pending gate', () => {
        expect(
          refusalUnder([
            { action: 'approve', subject: 'contract' },
            {
              action: 'approve',
              subject: 'contract',
              inverted: true,
              reason: 'DEC-7',
            },
          ]),
        ).toEqual({
          action: 'approve',
          subject: 'contract',
          actor: clerk,
          reason: 'denied',
          gate: 'DEC-7',
        });
      });

      it('reports the first reason given when every deny that applies has one', () => {
        expect(
          refusalUnder([
            {
              action: 'approve',
              subject: 'contract',
              inverted: true,
              reason: 'DEC-7',
            },
            {
              action: 'approve',
              subject: 'contract',
              inverted: true,
              reason: 'DEC-8',
            },
          ]),
        ).toEqual({
          action: 'approve',
          subject: 'contract',
          actor: clerk,
          reason: 'denied',
          gate: 'DEC-7',
        });
      });

      it('reports no gate when a deny that applies has no reason', () => {
        expect(
          refusalUnder([
            {
              action: 'approve',
              subject: 'contract',
              inverted: true,
              reason: 'DEC-7',
            },
            { action: 'approve', subject: 'contract', inverted: true },
          ]),
        ).toEqual({
          action: 'approve',
          subject: 'contract',
          actor: clerk,
          reason: 'denied',
        });
      });

      it('leaves denies naming fields out of the gate', () => {
        const rules: AuthorityRuleInterface<string>[] = [
          { action: 'approve', subject: 'contract' },
          {
            action: 'approve',
            subject: 'contract',
            inverted: true,
            reason: 'DEC-7',
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
          subject: 'contract',
          actor: clerk,
          reason: 'denied',
          gate: 'DEC-7',
        });
      });

      it('reports no gate on a field refusal', () => {
        expect(
          service.refusal(
            {
              actor: clerk,
              ability: createAccessAbility([
                { action: 'approve', subject: 'contract' },
                {
                  action: 'approve',
                  subject: 'contract',
                  fields: ['amount'],
                  inverted: true,
                  reason: 'DEC-7',
                },
              ]),
            },
            'approve',
            'contract',
            { fields: ['amount'] },
          ),
        ).toEqual({
          action: 'approve',
          subject: 'contract',
          actor: clerk,
          reason: 'field',
          field: 'amount',
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
          reason: 'field',
          field: 'role',
        });
      });

      it('refuses a denied field inside an array, whatever its position', () => {
        expect(refusalOf(rules, 'update', 'user', ['items.3.amount'])).toEqual({
          reason: 'field',
          field: 'items.amount',
        });
      });

      it('refuses a field beneath a denied parent', () => {
        expect(refusalOf(rules, 'update', 'user', ['address.city'])).toEqual({
          reason: 'field',
          field: 'address.city',
        });
      });

      // Writing `items` as a whole, as `{ items: null }` does, replaces
      // every field beneath it.
      it('refuses a field above a denied field', () => {
        expect(refusalOf(rules, 'update', 'user', ['items'])).toEqual({
          reason: 'field',
          field: 'items',
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
          reason: 'field',
          field: '0',
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
          reason: 'field',
          field: 'email',
        });
      });
    });
  });
});
