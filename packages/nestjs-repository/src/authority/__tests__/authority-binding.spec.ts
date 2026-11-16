import {
  HttpStatus,
  Injectable,
  Module,
  type PlainLiteralObject,
  Scope,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  type AuthorityDecision,
  type AuthorityInterface,
  type AuthorityRequestInterface,
  CoreModule,
  type RoleActorInterface,
  RuntimeException,
} from '@concepta/nestjs-core';

import {
  actorCtx,
  allow,
  AuthorityFixture,
  type AuthorityTableFixture,
} from '../../__fixtures__/memory/authority.fixture.js';
import { MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import {
  ORDER_METADATA,
  ORDER_TOKEN,
  OrderEntityFixture,
  type OrderFixture,
} from '../../__fixtures__/memory/order.fixture.js';
import { type RepositoryModuleOptionsInterface } from '../../interfaces/repository-module-options.interface.js';
import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
import { Where } from '../../repository/where.helpers.js';
import { RepositoryModule } from '../../repository.module.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';
import { AuthorityBootException } from '../exceptions/authority-boot.exception.js';
import { AuthorityRefusedException } from '../exceptions/authority-refused.exception.js';
import { AuthorityUnboundException } from '../exceptions/authority-unbound.exception.js';

const ALL = ['create', 'read', 'update', 'delete', 'softDelete', 'restore'];

const ADMIN = actorCtx({ kind: 'role', roles: ['admin'] });
const CLERK = actorCtx({ kind: 'role', roles: ['clerk'] });

const ORDER: OrderFixture = {
  id: 'order-1',
  tenantId: 'acme',
  description: 'first',
  dateDeleted: null,
};

function authorityModule(authority: AuthorityInterface) {
  @Module({
    providers: [{ provide: AuthorityFixture, useValue: authority }],
    exports: [AuthorityFixture],
  })
  class AuthorityModule {}
  return AuthorityModule;
}

const GOVERNED: RepositoryProviderOptions = {
  key: ORDER_TOKEN,
  entity: OrderEntityFixture,
  authority: { access: 'governed', authority: AuthorityFixture },
};

async function compile(
  entities: RepositoryProviderOptions[],
  authority: AuthorityInterface,
  moduleOptions: RepositoryModuleOptionsInterface = {},
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      CoreModule.forRoot({}),
      RepositoryModule.forRoot({
        ...moduleOptions,
        imports: [authorityModule(authority)],
        adapters: [{ driver: MemoryRepositoryModuleFixture, entities }],
      }),
    ],
  }).compile();
}

async function ordersWith(table: AuthorityTableFixture): Promise<{
  orders: MemoryRepositoryFixture<OrderFixture>;
  authority: AuthorityFixture;
}> {
  const authority = new AuthorityFixture({
    ...allow('role:admin', ORDER_TOKEN, ALL),
    ...table,
  });
  const moduleRef = await compile([GOVERNED], authority);
  const orders = moduleRef.get<MemoryRepositoryFixture<OrderFixture>>(
    getDynamicRepositoryToken(ORDER_TOKEN),
  );
  await orders.create(ORDER, { ctx: ADMIN });
  authority.requests.length = 0;
  return { orders, authority };
}

/**
 * Every operation, the actions it needs, and a call that would succeed when
 * they are allowed.
 */
const OPERATIONS: {
  name: string;
  actions: string[];
  run: (
    orders: MemoryRepositoryFixture<OrderFixture>,
    ctx: PlainLiteralObject | undefined,
  ) => Promise<unknown>;
}[] = [
  { name: 'find', actions: ['read'], run: (o, ctx) => o.find({ ctx }) },
  {
    name: 'findOne',
    actions: ['read'],
    run: (o, ctx) => o.findOne({ where: Where.eq('id', ORDER.id), ctx }),
  },
  { name: 'count', actions: ['read'], run: (o, ctx) => o.count({ ctx }) },
  {
    name: 'findAndCount',
    actions: ['read'],
    run: (o, ctx) => o.findAndCount({ ctx }),
  },
  {
    name: 'create',
    actions: ['create'],
    run: (o, ctx) => o.create({ ...ORDER, id: 'order-2' }, { ctx }),
  },
  {
    name: 'createMany',
    actions: ['create'],
    run: (o, ctx) => o.createMany([{ ...ORDER, id: 'order-2' }], { ctx }),
  },
  {
    name: 'update',
    actions: ['update'],
    run: (o, ctx) => o.update(ORDER, { description: 'changed' }, { ctx }),
  },
  {
    name: 'replace',
    actions: ['update'],
    run: (o, ctx) =>
      o.replace(ORDER, { ...ORDER, description: 'changed' }, { ctx }),
  },
  {
    name: 'upsert',
    actions: ['create', 'update'],
    run: (o, ctx) => o.upsert({ ...ORDER, description: 'changed' }, { ctx }),
  },
  {
    name: 'delete',
    actions: ['delete'],
    run: (o, ctx) => o.delete(ORDER, { ctx }),
  },
  {
    name: 'deleteMany',
    actions: ['delete'],
    run: (o, ctx) => o.deleteMany([ORDER], { ctx }),
  },
  {
    name: 'softDelete',
    actions: ['softDelete'],
    run: (o, ctx) => o.softDelete(ORDER, { ctx }),
  },
  {
    name: 'restore',
    actions: ['restore'],
    run: (o, ctx) => o.restore(ORDER, { ctx }),
  },
];

describe('authority binding', () => {
  describe('a governed entity', () => {
    it.each(OPERATIONS)(
      '$name: should run when the actor may take $actions',
      async ({ actions, run }) => {
        const { orders, authority } = await ordersWith(
          allow('role:clerk', ORDER_TOKEN, actions),
        );

        await expect(run(orders, CLERK)).resolves.toBeDefined();
        // A write also asks about read, to know what its result may show.
        const asked = actions.includes('read') ? actions : [...actions, 'read'];
        expect(authority.requests).toEqual(
          asked.map((action) => ({
            actor: { kind: 'role', roles: ['clerk'] },
            subject: ORDER_TOKEN,
            action,
            columns: ['id', 'tenantId', 'description', 'dateDeleted'],
          })),
        );
      },
    );

    it.each(
      OPERATIONS.flatMap(({ name, actions, run }) =>
        actions.map((missing) => ({ name, missing, actions, run })),
      ),
    )(
      '$name: should refuse, writing nothing, without $missing',
      async ({ missing, run }) => {
        const { orders } = await ordersWith(
          allow(
            'role:clerk',
            ORDER_TOKEN,
            ALL.filter((action) => action !== missing),
          ),
        );

        const error = await run(orders, CLERK).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AuthorityRefusedException);
        expect(error).toMatchObject({
          httpStatus: HttpStatus.FORBIDDEN,
          fault: 'client',
        });
        expect(orders.stored).toEqual([ORDER]);
      },
    );

    it.each(OPERATIONS)(
      '$name: should refuse a call with no actor',
      async ({ run }) => {
        const { orders, authority } = await ordersWith({});

        await expect(run(orders, {})).rejects.toThrow(
          AuthorityRefusedException,
        );
        await expect(run(orders, undefined)).rejects.toThrow(
          AuthorityRefusedException,
        );
        expect(authority.requests).toEqual([]);

        const error = await run(orders, {}).catch((e: unknown) => e);
        expect(
          error instanceof AuthorityRefusedException && {
            refusal: error.context.refusal,
            actor: error.context.actor,
          },
        ).toEqual({ refusal: 'no-actor', actor: undefined });
      },
    );

    it('should refuse when any of the actor’s keys is refused', async () => {
      const { orders } = await ordersWith({
        ...allow('role:clerk', ORDER_TOKEN, ['read']),
        [`role:temp ${ORDER_TOKEN} read`]: { effect: 'refuse' },
      });

      await expect(
        orders.find({
          ctx: actorCtx({ kind: 'role', roles: ['clerk', 'temp'] }),
        }),
      ).rejects.toThrow(AuthorityRefusedException);
    });

    it('should pass the authority a signed-in actor’s user id', async () => {
      const { orders, authority } = await ordersWith(
        allow('role:clerk', ORDER_TOKEN, ['read']),
      );

      await orders.find({
        ctx: actorCtx({ kind: 'role', roles: ['clerk'], userId: 'user-7' }),
      });

      expect(authority.requests.map(({ actor }) => actor)).toEqual([
        { kind: 'role', roles: ['clerk'], userId: 'user-7' },
      ]);
    });

    it('should decide a system actor by its own key', async () => {
      const { orders } = await ordersWith(
        allow('system:billing', ORDER_TOKEN, ['read']),
      );

      await expect(
        orders.find({ ctx: actorCtx({ kind: 'system', name: 'billing' }) }),
      ).resolves.toEqual([ORDER]);
    });

    it('should refuse a create naming a stored key before revealing it is taken', async () => {
      const { orders } = await ordersWith(
        allow('role:clerk', ORDER_TOKEN, ['read']),
      );

      await expect(orders.create(ORDER, { ctx: CLERK })).rejects.toThrow(
        AuthorityRefusedException,
      );
    });

    it('should refuse a delete of a missing row before revealing it is missing', async () => {
      const { orders } = await ordersWith(
        allow('role:clerk', ORDER_TOKEN, ['read']),
      );

      await expect(
        orders.delete({ ...ORDER, id: 'missing' }, { ctx: CLERK }),
      ).rejects.toThrow(AuthorityRefusedException);
    });

    it('should keep a pending decision’s gate in the context, not the message', async () => {
      const { orders } = await ordersWith({
        [`role:clerk ${ORDER_TOKEN} read`]: {
          effect: 'refuse',
          gate: 'DEC-12',
        },
      });

      const error = await orders.find({ ctx: CLERK }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AuthorityRefusedException);
      if (error instanceof RuntimeException) {
        expect(error.context).toMatchObject({ gate: 'DEC-12' });
        expect(error.message).not.toContain('DEC-12');
        expect(error.message).not.toContain('clerk');
      }
    });

    it('should name the action and entity key in the message, and why and who in the context', async () => {
      const { orders } = await ordersWith({});
      const resolved: RoleActorInterface & { email: string } = {
        kind: 'role',
        roles: ['clerk'],
        userId: 'user-1',
        email: 'clerk@example.com',
      };

      const error = await orders
        .find({ ctx: actorCtx(resolved) })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AuthorityRefusedException);
      if (error instanceof AuthorityRefusedException) {
        expect(error.message).toEqual(`Not allowed to read ${ORDER_TOKEN}`);
        expect(error.context.entityKey).toEqual(ORDER_TOKEN);
        expect(error.context.refusal).toEqual('authority');
        expect(error.context.actor).toStrictEqual({
          kind: 'role',
          roles: ['clerk'],
          userId: 'user-1',
        });
      }
    });

    it('should accept an authority answering asynchronously', async () => {
      const authority: AuthorityInterface = {
        decide: async () => ({ effect: 'allow' }),
      };
      const moduleRef = await compile([GOVERNED], authority);
      const orders = moduleRef.get<MemoryRepositoryFixture<OrderFixture>>(
        getDynamicRepositoryToken(ORDER_TOKEN),
      );

      await expect(orders.find({ ctx: CLERK })).resolves.toEqual([]);
    });

    it('should accept an authority typed to its entity’s columns', async () => {
      @Injectable()
      class OrderColumnsAuthority implements AuthorityInterface<
        keyof OrderFixture & string
      > {
        decide(
          _ctx: PlainLiteralObject,
          { columns }: AuthorityRequestInterface<keyof OrderFixture & string>,
        ): AuthorityDecision<keyof OrderFixture & string> {
          return {
            effect: 'allow',
            columns: columns.filter((column) => column !== 'tenantId'),
          };
        }
      }
      @Module({
        providers: [OrderColumnsAuthority],
        exports: [OrderColumnsAuthority],
      })
      class OrderColumnsModule {}
      const moduleRef = await Test.createTestingModule({
        imports: [
          CoreModule.forRoot({}),
          RepositoryModule.forRoot({
            imports: [OrderColumnsModule],
            adapters: [
              {
                driver: MemoryRepositoryModuleFixture,
                entities: [
                  {
                    ...GOVERNED,
                    authority: {
                      access: 'governed',
                      authority: OrderColumnsAuthority,
                    },
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
      await orders.create(
        { id: ORDER.id, description: ORDER.description },
        { ctx: CLERK },
      );

      await expect(orders.find({ ctx: CLERK })).resolves.toEqual([
        { id: ORDER.id, description: ORDER.description, dateDeleted: null },
      ]);
    });
  });

  describe('an open or undeclared entity', () => {
    it.each([
      {
        name: 'open',
        entity: {
          key: ORDER_TOKEN,
          entity: OrderEntityFixture,
          authority: { access: 'open', reason: 'reference data' },
        } satisfies RepositoryProviderOptions,
      },
      {
        name: 'undeclared',
        entity: {
          key: ORDER_TOKEN,
          entity: OrderEntityFixture,
        } satisfies RepositoryProviderOptions,
      },
    ])('$name: should never consult an authority', async ({ entity }) => {
      const authority = new AuthorityFixture();
      const moduleRef = await compile([entity], authority);
      const orders = moduleRef.get<MemoryRepositoryFixture<OrderFixture>>(
        getDynamicRepositoryToken(ORDER_TOKEN),
      );

      await orders.create(ORDER, { ctx: {} });
      await expect(orders.find({})).resolves.toEqual([ORDER]);
      expect(authority.requests).toEqual([]);
    });
  });

  describe('startup', () => {
    it('should refuse replacing an attached authority', async () => {
      const { orders } = await ordersWith({});

      expect(() => orders.setAuthority(new AuthorityFixture())).toThrow(
        AuthorityBootException,
      );
      // The attached one still decides.
      await expect(orders.find({ ctx: ADMIN })).resolves.toEqual([ORDER]);
    });

    it('should refuse every call before its authority is attached', async () => {
      const orders = new MemoryRepositoryFixture<OrderFixture>(
        ORDER_TOKEN,
        ORDER_METADATA,
      );
      orders.bind({ authority: GOVERNED.authority });

      await expect(orders.find({ ctx: ADMIN })).rejects.toThrow(
        AuthorityUnboundException,
      );
      await expect(orders.create(ORDER, { ctx: ADMIN })).rejects.toThrow(
        AuthorityUnboundException,
      );
      expect(orders.stored).toEqual([]);
    });

    it('should refuse an undeclared entity when declarations are required', async () => {
      await expect(
        compile(
          [{ key: ORDER_TOKEN, entity: OrderEntityFixture }],
          new AuthorityFixture(),
          { authority: { required: true } },
        ),
      ).rejects.toThrow(AuthorityBootException);
    });

    it('should refuse an undeclared entity when forRootAsync requires declarations', async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            CoreModule.forRoot({}),
            RepositoryModule.forRootAsync({
              imports: [authorityModule(new AuthorityFixture())],
              adapters: [
                {
                  driver: MemoryRepositoryModuleFixture,
                  entities: [{ key: ORDER_TOKEN, entity: OrderEntityFixture }],
                },
              ],
              useFactory: async () => ({ authority: { required: true } }),
            }),
          ],
        }).compile(),
      ).rejects.toThrow(AuthorityBootException);
    });

    it('should accept an undeclared entity when declarations are not required', async () => {
      await expect(
        compile(
          [{ key: ORDER_TOKEN, entity: OrderEntityFixture }],
          new AuthorityFixture(),
          { authority: { required: false } },
        ),
      ).resolves.toBeDefined();
    });

    it('should accept an open entity when declarations are required', async () => {
      await expect(
        compile(
          [
            {
              key: ORDER_TOKEN,
              entity: OrderEntityFixture,
              authority: { access: 'open', reason: 'reference data' },
            },
          ],
          new AuthorityFixture(),
          { authority: { required: true } },
        ),
      ).resolves.toBeDefined();
    });

    it('should refuse an authority declared request-scoped', async () => {
      @Injectable({ scope: Scope.REQUEST })
      class RequestAuthority implements AuthorityInterface {
        decide() {
          return { effect: 'allow' as const };
        }
      }

      @Module({ providers: [RequestAuthority], exports: [RequestAuthority] })
      class RequestAuthorityModule {}

      await expect(async () =>
        Test.createTestingModule({
          imports: [
            CoreModule.forRoot({}),
            RepositoryModule.forRoot({
              imports: [RequestAuthorityModule],
              adapters: [
                {
                  driver: MemoryRepositoryModuleFixture,
                  entities: [
                    {
                      key: ORDER_TOKEN,
                      entity: OrderEntityFixture,
                      authority: {
                        access: 'governed',
                        authority: RequestAuthority,
                      },
                    },
                  ],
                },
              ],
            }),
          ],
        }).compile(),
      ).rejects.toThrow(AuthorityBootException);
    });

    it('should refuse an authority request-scoped through a dependency', async () => {
      @Injectable({ scope: Scope.REQUEST })
      class RequestDependency {}

      @Injectable()
      class DependentAuthority implements AuthorityInterface {
        constructor(readonly dependency: RequestDependency) {}
        decide() {
          return { effect: 'allow' as const };
        }
      }

      @Module({
        providers: [RequestDependency, DependentAuthority],
        exports: [DependentAuthority],
      })
      class DependentAuthorityModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [
          CoreModule.forRoot({}),
          RepositoryModule.forRoot({
            imports: [DependentAuthorityModule],
            adapters: [
              {
                driver: MemoryRepositoryModuleFixture,
                entities: [
                  {
                    key: ORDER_TOKEN,
                    entity: OrderEntityFixture,
                    authority: {
                      access: 'governed',
                      authority: DependentAuthority,
                    },
                  },
                ],
              },
            ],
          }),
        ],
      }).compile();

      await expect(moduleRef.init()).rejects.toThrow(AuthorityBootException);
    });
  });
});
