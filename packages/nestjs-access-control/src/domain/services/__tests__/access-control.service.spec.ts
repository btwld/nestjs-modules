import { type PlainLiteralObject } from '@nestjs/common';

import { StaticAccessGrantsProvider } from '../../../infrastructure/grants/static-access-grants.provider.js';
import { PossessionEnum } from '../../enums/possession.enum.js';
import { AccessControlException } from '../../exceptions/access-control.exception.js';
import { AccessRefusedException } from '../../exceptions/access-refused.exception.js';
import { AccessRulesInvalidException } from '../../exceptions/access-rules-invalid.exception.js';
import { type AccessActorResolverInterface } from '../../interfaces/access-actor-resolver.interface.js';
import { type AccessActor } from '../../interfaces/access-actor.type.js';
import { type AccessDecisionSourceInterface } from '../../interfaces/access-decision-source.interface.js';
import { type AccessGrantsProviderInterface } from '../../interfaces/access-grants-provider.interface.js';
import { type AccessGrants } from '../../interfaces/access-grants.type.js';
import { type AccessRuleInterface } from '../../interfaces/access-rule.interface.js';
import { createAccessAbility } from '../../utils/create-access-ability.util.js';
import { AccessControlService } from '../access-control.service.js';

describe(AccessControlService.name, () => {
  const actingAs = (actor?: AccessActor): AccessActorResolverInterface => ({
    actorFor: async () => actor,
  });

  const serviceFor = (actor: AccessActor | undefined, grants: AccessGrants) =>
    new AccessControlService(
      actingAs(actor),
      new StaticAccessGrantsProvider(grants),
    );

  const clerk: AccessActor = { kind: 'role', roles: ['clerk'] };

  describe('assert', () => {
    it('refuses when nobody is acting', async () => {
      await expect(
        serviceFor(undefined, {}).assert({}, 'read:any', 'user'),
      ).rejects.toThrow(
        expect.objectContaining({
          constructor: AccessRefusedException,
          context: expect.objectContaining({
            action: 'read:any',
            subject: 'user',
            reason: 'no-actor',
          }),
        }),
      );
    });

    it('refuses an actor with no grant, naming them', async () => {
      await expect(
        serviceFor(clerk, {}).assert({}, 'read:any', 'user'),
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
          'role:clerk': [{ action: 'read:any', subject: 'user' }],
        }).assert({}, 'read:any', 'user'),
      ).resolves.toBeUndefined();
    });

    it('lets a deny on one role win over another role allowing it', async () => {
      const service = serviceFor(
        { kind: 'role', roles: ['clerk', 'admin'] },
        {
          'role:clerk': [
            { action: 'delete:own', subject: 'user', inverted: true },
          ],
          'role:admin': [{ action: 'delete:own', subject: 'user' }],
        },
      );

      await expect(service.assert({}, 'delete:own', 'user')).rejects.toThrow(
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
            { action: 'read:any', subject: 'user' },
            {
              action: 'read:any',
              subject: 'user',
              fields: ['salary'],
              inverted: true,
            },
          ],
          'role:b': [{ action: 'read:any', subject: 'user' }],
        },
      );

      await expect(
        service.assert({}, 'read:any', 'user', { fields: ['salary'] }),
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
          { action: 'update:any', subject: 'contract' },
          {
            action: 'update:any',
            subject: 'contract',
            fields: ['amount'],
            inverted: true,
          },
        ],
      });

      await expect(
        service.assert({}, 'update:any', 'contract', { fields: ['notes'] }),
      ).resolves.toBeUndefined();
      await expect(
        service.assert({}, 'update:any', 'contract', {
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

  const decisionRules: AccessRuleInterface[] = [
    { action: 'update:any', subject: 'document' },
    { action: 'update:own', subject: 'document' },
    {
      action: 'update:own',
      subject: 'document',
      fields: ['ownerId'],
      inverted: true,
    },
  ];

  const decidedOn = (
    possession: PossessionEnum,
  ): AccessDecisionSourceInterface => ({
    decisionFor: () => ({
      query: {
        actor: clerk,
        action: 'update',
        possession,
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
      expect(
        serviceDeciding(decidedOn(PossessionEnum.OWN)).decision({}),
      ).toEqual({
        actor: clerk,
        action: 'update',
        possession: PossessionEnum.OWN,
        resource: 'document',
      });
    });

    it('returns a copy, so changing it changes no later check', () => {
      const actor: AccessActor = { kind: 'role', roles: ['clerk'] };
      const service = serviceDeciding({
        decisionFor: () => ({
          query: {
            actor,
            action: 'update',
            possession: PossessionEnum.OWN,
            resource: 'document',
          },
          ability: createAccessAbility(decisionRules),
        }),
      });
      const decided = service.decision({});

      if (decided?.actor.kind === 'role') {
        decided.actor.roles.push('admin');
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
    it('checks the fields against the possession the route let the call through on', async () => {
      await expect(
        serviceDeciding(decidedOn(PossessionEnum.ANY)).assertFields({}, [
          'ownerId',
        ]),
      ).resolves.toBeUndefined();
      await expect(
        serviceDeciding(decidedOn(PossessionEnum.OWN)).assertFields({}, [
          'ownerId',
        ]),
      ).rejects.toThrow(
        expect.objectContaining({
          constructor: AccessRefusedException,
          context: expect.objectContaining({
            action: 'update:own',
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
        serviceDeciding(decidedOn(PossessionEnum.OWN)).assertFields({}, [
          'title',
          'tags.3.label',
        ]),
      ).resolves.toBeUndefined();
    });

    it('reuses the route decision, never resolving the rules again', async () => {
      const rulesFor = vi.fn<AccessGrantsProviderInterface['rulesFor']>();

      await serviceDeciding(
        decidedOn(PossessionEnum.OWN),
        rulesFor,
      ).assertFields({}, ['title']);

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
      expect(await serviceFor(undefined, {}).can({}, 'read:any', 'user')).toBe(
        false,
      );
    });
  });

  describe('systems', () => {
    const grants: AccessGrants = {
      'system:agile': [{ action: 'approve:any', subject: 'contract' }],
      'role:agile': [
        { action: 'approve:any', subject: 'contract', inverted: true },
      ],
      'role:clerk': [{ action: 'export:any', subject: 'statement' }],
    };

    it('allows a system where a role of the same name is refused', async () => {
      expect(
        await serviceFor({ kind: 'system', name: 'agile' }, grants).can(
          {},
          'approve:any',
          'contract',
        ),
      ).toEqual(true);
      expect(
        await serviceFor({ kind: 'role', roles: ['agile'] }, grants).can(
          {},
          'approve:any',
          'contract',
        ),
      ).toEqual(false);
    });

    it('allows a role where a system has no grant', async () => {
      expect(
        await serviceFor(clerk, grants).can({}, 'export:any', 'statement'),
      ).toEqual(true);
      expect(
        await serviceFor({ kind: 'system', name: 'agile' }, grants).can(
          {},
          'export:any',
          'statement',
        ),
      ).toEqual(false);
    });
  });

  describe('per-user rules from a grants provider', () => {
    const template: AccessRuleInterface[] = [
      { action: 'read:any', subject: 'invoice' },
      { action: 'void:any', subject: 'invoice', inverted: true },
    ];

    const provider = (
      userRules: AccessRuleInterface[],
    ): AccessGrantsProviderInterface => ({
      rulesFor: async () => [...template, ...userRules],
    });

    const user: AccessActor = { kind: 'role', roles: ['clerk'], userId: 'u1' };

    it('lets a user rule remove what the template allows', async () => {
      const service = new AccessControlService(
        actingAs(user),
        provider([{ action: 'read:any', subject: 'invoice', inverted: true }]),
      );

      expect(await service.can({}, 'read:any', 'invoice')).toEqual(false);
    });

    it('never lets a user rule override a template deny', async () => {
      const service = new AccessControlService(
        actingAs(user),
        provider([{ action: 'void:any', subject: 'invoice' }]),
      );

      expect(await service.can({}, 'void:any', 'invoice')).toEqual(false);
    });

    it('asks the provider on every call, with the ctx and actor', async () => {
      const rulesFor = vi
        .fn<AccessGrantsProviderInterface['rulesFor']>()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ action: 'read:any', subject: 'invoice' }]);
      const ctx: PlainLiteralObject = {};
      const service = new AccessControlService(actingAs(user), { rulesFor });

      expect(await service.can(ctx, 'read:any', 'invoice')).toEqual(false);
      expect(await service.can(ctx, 'read:any', 'invoice')).toEqual(true);
      expect(rulesFor).toHaveBeenCalledWith(ctx, user);
    });

    it('refuses rules a provider returns that cannot be used', async () => {
      const service = new AccessControlService(actingAs(user), {
        rulesFor: async () => [{ action: 'manage:any', subject: 'all' }],
      });

      await expect(service.can({}, 'read:any', 'invoice')).rejects.toThrow(
        AccessRulesInvalidException,
      );
    });
  });

  describe('effectiveRules', () => {
    it('returns the actor rules, denies last', async () => {
      const service = serviceFor(
        { kind: 'role', roles: ['a', 'b'] },
        {
          'role:a': [
            { action: 'void:any', subject: 'invoice', inverted: true },
          ],
          'role:b': [{ action: 'read:any', subject: 'invoice' }],
        },
      );

      expect(await service.effectiveRules({})).toEqual([
        { action: 'read:any', subject: 'invoice' },
        { action: 'void:any', subject: 'invoice', inverted: true },
      ]);
    });

    it('is empty when nobody is acting', async () => {
      expect(await serviceFor(undefined, {}).effectiveRules({})).toEqual([]);
    });
  });

  describe('refusal', () => {
    const service = serviceFor(undefined, {});

    const refusalOf = (
      rules: AccessRuleInterface[],
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
          'read:any',
          'user',
        ),
      ).toEqual({
        action: 'read:any',
        subject: 'user',
        actor: clerk,
        reason: 'no-grant',
      });
    });

    it('allows what a rule grants', () => {
      const rules = [{ action: 'read:any', subject: 'user' }];

      expect(refusalOf(rules, 'read:any', 'user')).toBeUndefined();
      expect(refusalOf(rules, 'read:any', 'org')).toEqual({
        reason: 'no-grant',
        field: undefined,
      });
    });

    it('keeps any and own apart: denying own leaves any', () => {
      const rules = [
        { action: 'delete:any', subject: 'user' },
        { action: 'delete:own', subject: 'user', inverted: true },
      ];

      expect(refusalOf(rules, 'delete:any', 'user')).toBeUndefined();
      expect(refusalOf(rules, 'delete:own', 'user')).toEqual({
        reason: 'denied',
        field: undefined,
      });
    });

    it('never treats own as any', () => {
      expect(
        refusalOf(
          [{ action: 'read:own', subject: 'user' }],
          'read:any',
          'user',
        ),
      ).toEqual({ reason: 'no-grant', field: undefined });
    });

    describe('fields', () => {
      const rules: AccessRuleInterface[] = [
        { action: 'update:any', subject: 'user' },
        {
          action: 'update:any',
          subject: 'user',
          fields: ['role', 'items.amount', 'address'],
          inverted: true,
        },
      ];

      it('allows the resource without fields, whatever its field denies', () => {
        expect(refusalOf(rules, 'update:any', 'user')).toBeUndefined();
      });

      it('refuses a denied field the call names', () => {
        expect(
          refusalOf(rules, 'update:any', 'user', ['name', 'role']),
        ).toEqual({ reason: 'field', field: 'role' });
      });

      it('refuses a denied field inside an array, whatever its position', () => {
        expect(
          refusalOf(rules, 'update:any', 'user', ['items.3.amount']),
        ).toEqual({ reason: 'field', field: 'items.amount' });
      });

      it('refuses a field beneath a denied parent', () => {
        expect(
          refusalOf(rules, 'update:any', 'user', ['address.city']),
        ).toEqual({ reason: 'field', field: 'address.city' });
      });

      // Writing `items` as a whole, as `{ items: null }` does, replaces
      // every field beneath it.
      it('refuses a field above a denied field', () => {
        expect(refusalOf(rules, 'update:any', 'user', ['items'])).toEqual({
          reason: 'field',
          field: 'items',
        });
      });

      it('allows a field whose name only starts like a denied one', () => {
        expect(
          refusalOf(rules, 'update:any', 'user', ['item', 'roles']),
        ).toBeUndefined();
      });

      it('refuses a numeric top-level key to an allow naming fields', () => {
        const limited = [
          { action: 'update:any', subject: 'user', fields: ['name'] },
        ];

        expect(refusalOf(limited, 'update:any', 'user', ['0'])).toEqual({
          reason: 'field',
          field: '0',
        });
        expect(
          refusalOf(
            [{ action: 'update:any', subject: 'user' }],
            'update:any',
            'user',
            ['0'],
          ),
        ).toBeUndefined();
      });

      it('allows fields no deny covers', () => {
        expect(
          refusalOf(rules, 'update:any', 'user', ['name', 'items.3.label']),
        ).toBeUndefined();
      });

      it('allows only the fields an allow names', () => {
        const limited = [
          {
            action: 'update:any',
            subject: 'user',
            fields: ['name', 'profile'],
          },
        ];

        expect(
          refusalOf(limited, 'update:any', 'user', ['name', 'profile.bio']),
        ).toBeUndefined();
        expect(refusalOf(limited, 'update:any', 'user', ['email'])).toEqual({
          reason: 'field',
          field: 'email',
        });
      });
    });
  });
});
