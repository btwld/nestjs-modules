import { type PlainLiteralObject } from '@nestjs/common';

import {
  ActionEnum,
  type Actor,
  AppContextHost,
  Operation,
} from '@concepta/nestjs-core';
import {
  type CrudContextInterface,
  CrudCtx,
  type CrudParsedQueryInterface,
} from '@concepta/nestjs-crud';
import { WhereOperator } from '@concepta/nestjs-repository';

import { PossessionEnum } from '../../../domain/enums/possession.enum.js';
import { AccessRefusedException } from '../../../domain/exceptions/access-refused.exception.js';
import { type AccessRuleInterface } from '../../../domain/interfaces/access-rule.interface.js';
import { AccessControlService } from '../../../domain/services/access-control.service.js';
import { createAccessAbility } from '../../../domain/utils/create-access-ability.util.js';
import { StaticAccessGrantsProvider } from '../../../infrastructure/grants/static-access-grants.provider.js';
import { AccessCtxDecisionSource } from '../../access-ctx-decision.source.js';
import { AccessDecisionCtx } from '../../interfaces/access-decision-context.interface.js';
import { AccessControlCrudPolicy } from '../access-control-crud.policy.js';

const CLERK: Actor = { kind: 'role', roles: ['clerk'] };

/** What the clerk was let in on: invoices, without `secret`, never `amount`. */
const RULES: AccessRuleInterface[] = [
  { action: ['read:any', 'create:any', 'update:any'], subject: 'invoice' },
  {
    action: 'read:any',
    subject: 'invoice',
    fields: ['secret'],
    inverted: true,
  },
  {
    action: ['create:any', 'update:any'],
    subject: 'invoice',
    fields: ['amount'],
    inverted: true,
  },
];

const NO_QUERY: CrudParsedQueryInterface<PlainLiteralObject> = {
  fields: [],
  search: undefined,
  filter: [],
  or: [],
  sort: [],
  limit: undefined,
  offset: undefined,
  page: undefined,
  cache: undefined,
  includeDeleted: undefined,
};

/** The CRUD context of a call the route guard let in on `action:any`. */
function crudCtx(
  operation: Operation,
  action: string,
  query: Partial<CrudParsedQueryInterface<PlainLiteralObject>> = {},
  decided = true,
  {
    rules = RULES,
    params = {},
  }: { rules?: AccessRuleInterface[]; params?: Record<string, unknown> } = {},
): CrudContextInterface {
  const host = new AppContextHost();
  if (decided) {
    host.defineOverlay(
      AccessDecisionCtx,
      {
        query: {
          actor: CLERK,
          action,
          possession: PossessionEnum.ANY,
          resource: 'invoice',
        },
        ability: createAccessAbility(rules),
      },
      { immutable: true },
    );
  }
  host.defineOverlay(CrudCtx, {
    entity: 'invoice',
    params,
    query: { ...NO_QUERY, ...query },
    options: {},
    operation,
    action: ActionEnum.READ,
  });
  return host.with(CrudCtx);
}

const policy = new AccessControlCrudPolicy(
  new AccessControlService(
    { actorFor: async () => CLERK },
    new StaticAccessGrantsProvider({}),
    new AccessCtxDecisionSource(),
  ),
);

async function refusalOf(promise: Promise<void>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AccessRefusedException);
  return error;
}

describe(AccessControlCrudPolicy.name, () => {
  it('lets a call no route check let in through', async () => {
    await expect(
      policy.check({
        ctx: crudCtx(Operation.List, 'read', { sort: [] }, false),
      }),
    ).resolves.toBeUndefined();
  });

  describe('the query', () => {
    const eq = (field: string, relation?: string) => ({
      field,
      operator: WhereOperator.EQ,
      value: 'x',
      ...(relation ? { relation } : {}),
    });

    it('lets a query naming readable fields through', async () => {
      await expect(
        policy.check({
          ctx: crudCtx(Operation.List, 'read', {
            filter: [eq('customer')],
            sort: [{ field: 'amount', order: 'ASC' }],
          }),
        }),
      ).resolves.toBeUndefined();
    });

    it.each([
      { name: 'filter', query: { filter: [eq('secret')] } },
      { name: 'or', query: { or: [eq('customer'), eq('secret')] } },
      {
        name: 'sort',
        query: { sort: [{ field: 'secret', order: 'DESC' as const }] },
      },
      { name: 'search', query: { search: { secret: 'x' } } },
      {
        name: 'search, inside $or',
        query: {
          search: { $or: [{ customer: 'x' }, { secret: { $eq: 'x' } }] },
        },
      },
      {
        name: 'search, inside $and',
        query: { search: { $and: [{ customer: 'x' }, { secret: 'x' }] } },
      },
    ])(
      'refuses a $name naming a field the caller may not read',
      async ({ query }) => {
        const error = await refusalOf(
          policy.check({ ctx: crudCtx(Operation.List, 'read', query) }),
        );

        expect(error).toMatchObject({
          context: { reason: 'field', field: 'secret', subject: 'invoice' },
        });
      },
    );

    it('refuses a field above one the caller may not read, whose value matching it would test', async () => {
      const error = await refusalOf(
        policy.check({
          ctx: crudCtx(
            Operation.List,
            'read',
            { filter: [eq('profile')] },
            true,
            {
              rules: [
                { action: 'read:any', subject: 'invoice' },
                {
                  action: 'read:any',
                  subject: 'invoice',
                  fields: ['profile.ssn'],
                  inverted: true,
                },
              ],
            },
          ),
        }),
      );

      expect(error).toMatchObject({ context: { field: 'profile' } });
    });

    it('checks a relation’s field by its path', async () => {
      const error = await refusalOf(
        policy.check({
          ctx: crudCtx(Operation.List, 'read', {
            filter: [eq('name', 'secret')],
          }),
        }),
      );

      expect(error).toMatchObject({ context: { field: 'secret.name' } });
    });

    it('checks the query of a write too, since it picks the rows it writes', async () => {
      await refusalOf(
        policy.check({
          ctx: crudCtx(Operation.Delete, 'delete', { filter: [eq('secret')] }),
          body: undefined,
        }),
      );
    });
  });

  describe('the body', () => {
    it('lets a write of writable fields through', async () => {
      await expect(
        policy.check({
          ctx: crudCtx(Operation.Update, 'update'),
          body: { customer: 'Initech' },
        }),
      ).resolves.toBeUndefined();
    });

    it.each([
      { operation: Operation.Create, action: 'create' },
      { operation: Operation.Update, action: 'update' },
    ])(
      '$operation: refuses a field the caller may not write',
      async ({ operation, action }) => {
        const error = await refusalOf(
          policy.check({
            ctx: crudCtx(operation, action),
            body: { customer: 'Initech', amount: 1 },
          }),
        );

        expect(error).toMatchObject({
          context: { reason: 'field', field: 'amount' },
        });
      },
    );

    it('refuses a batch when any item writes a field the caller may not write', async () => {
      await refusalOf(
        policy.check({
          ctx: crudCtx(Operation.CreateBatch, 'create'),
          body: { bulk: [{ customer: 'A' }, { customer: 'B', amount: 1 }] },
        }),
      );
    });

    it('refuses a replace whenever a field is denied, since it erases what it leaves out', async () => {
      const error = await refusalOf(
        policy.check({
          ctx: crudCtx(Operation.Replace, 'update'),
          body: { customer: 'Initech' },
        }),
      );

      expect(error).toMatchObject({
        context: { reason: 'field', field: 'amount' },
      });
    });

    it('refuses a replace when the caller may write only some fields', async () => {
      const error = await refusalOf(
        policy.check({
          ctx: crudCtx(Operation.Replace, 'update', {}, true, {
            rules: [
              { action: 'read:any', subject: 'invoice' },
              {
                action: 'update:any',
                subject: 'invoice',
                fields: ['customer'],
              },
            ],
          }),
          body: { customer: 'Initech' },
        }),
      );

      expect(error).toMatchObject({ context: { reason: 'field' } });
    });

    it('lets a replace through when the caller may write every field', async () => {
      await expect(
        policy.check({
          ctx: crudCtx(Operation.Replace, 'update', {}, true, {
            rules: [{ action: ['read:any', 'update:any'], subject: 'invoice' }],
          }),
          body: { customer: 'Initech' },
        }),
      ).resolves.toBeUndefined();
    });

    it('checks the route parameters a create writes beside its body', async () => {
      const error = await refusalOf(
        policy.check({
          ctx: crudCtx(Operation.Create, 'create', {}, true, {
            params: { amount: 5 },
          }),
          body: { customer: 'Initech' },
        }),
      );

      expect(error).toMatchObject({ context: { field: 'amount' } });
    });
  });
});
