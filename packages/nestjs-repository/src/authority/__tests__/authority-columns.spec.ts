import { Module, type PlainLiteralObject } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import {
  type Actor,
  ActorCtx,
  AppContextHost,
  type AuthorityDecision,
  CoreModule,
} from '@concepta/nestjs-core';

import {
  actorCtx,
  allow,
  AuthorityFixture,
  type AuthorityTableFixture,
} from '../../__fixtures__/memory/authority.fixture.js';
import { type MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import { JoinableTenantRowScopeFixture } from '../../__fixtures__/memory/order-row-scope.fixture.js';
import {
  ORDER_TOKEN,
  OrderEntityFixture,
  type OrderFixture,
} from '../../__fixtures__/memory/order.fixture.js';
import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
import { SortOrder } from '../../repository/repository.types.js';
import { Where } from '../../repository/where.helpers.js';
import { RepositoryModule } from '../../repository.module.js';
import { RowScopeCtx } from '../../row-scope/interfaces/row-scope-context.interface.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';
import { AuthorityRefusedException } from '../exceptions/authority-refused.exception.js';

const ALL = ['create', 'read', 'update', 'delete'];

const ADMIN: Actor = { kind: 'role', roles: ['admin'] };
const CLERK: Actor = { kind: 'role', roles: ['clerk'] };

const ORDER: OrderFixture = {
  id: 'order-1',
  tenantId: 'acme',
  description: 'first',
  dateDeleted: null,
};

/** `actorKey` may take `action` on orders, on `columns` only. */
function only(
  actorKey: string,
  action: string,
  columns: string[],
): AuthorityTableFixture {
  const decision: AuthorityDecision = { effect: 'allow', columns };
  return { [`${actorKey} ${ORDER_TOKEN} ${action}`]: decision };
}

/** A ctx carrying the actor and, for a scoped entity, the tenant. */
function ctxOf(actor: Actor, tenantId?: string): AppContextHost {
  if (tenantId === undefined) return actorCtx(actor);
  const ctx = new AppContextHost();
  ctx.defineOverlay(RowScopeCtx, { tenantId }, { immutable: true });
  ctx.defineOverlay(ActorCtx, actor, { immutable: true });
  return ctx;
}

async function ordersWith(
  table: AuthorityTableFixture,
  options: { scoped?: boolean } = {},
): Promise<MemoryRepositoryFixture<OrderFixture>> {
  const authority = new AuthorityFixture({
    ...allow('role:admin', ORDER_TOKEN, ALL),
    ...table,
  });

  @Module({
    providers: [
      { provide: AuthorityFixture, useValue: authority },
      JoinableTenantRowScopeFixture,
    ],
    exports: [AuthorityFixture, JoinableTenantRowScopeFixture],
  })
  class DecidersModule {}

  const entity: RepositoryProviderOptions = {
    key: ORDER_TOKEN,
    entity: OrderEntityFixture,
    authority: { access: 'governed', authority: AuthorityFixture },
    ...(options.scoped
      ? {
          rowScope: {
            access: 'scoped',
            resolver: JoinableTenantRowScopeFixture,
          },
        }
      : {}),
  };

  const moduleRef = await Test.createTestingModule({
    imports: [
      CoreModule.forRoot({}),
      RepositoryModule.forRoot({
        imports: [DecidersModule],
        drivers: [
          { driver: MemoryRepositoryModuleFixture, entities: [entity] },
        ],
      }),
    ],
  }).compile();
  await moduleRef.init();

  const orders = moduleRef.get<MemoryRepositoryFixture<OrderFixture>>(
    getDynamicRepositoryToken(ORDER_TOKEN),
  );
  await orders.create(ORDER, { ctx: ctxOf(ADMIN, 'acme') });
  orders.queries.length = 0;
  return orders;
}

async function refusal(promise: Promise<unknown>): Promise<unknown> {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AuthorityRefusedException);
  return error;
}

describe('authority over columns', () => {
  describe('reads', () => {
    const READS = only('role:clerk', 'read', ['id', 'description']);

    it('should read only the readable columns when the caller selects none', async () => {
      const orders = await ordersWith(READS);

      await expect(orders.find({ ctx: ctxOf(CLERK) })).resolves.toEqual([
        { id: ORDER.id, description: ORDER.description },
      ]);
      expect(orders.queries.map(({ select }) => select)).toEqual([
        ['id', 'description'],
      ]);
    });

    it('should read every column when the actor may read them all', async () => {
      const orders = await ordersWith(
        allow('role:clerk', ORDER_TOKEN, ['read']),
      );

      await expect(orders.find({ ctx: ctxOf(CLERK) })).resolves.toEqual([
        ORDER,
      ]);
      expect(orders.queries.map(({ select }) => select)).toEqual([undefined]);
    });

    it('should read an empty select as no select, which every driver reads as all', async () => {
      const orders = await ordersWith(READS);

      await expect(
        orders.find({ select: [], ctx: ctxOf(CLERK) }),
      ).resolves.toEqual([{ id: ORDER.id, description: ORDER.description }]);
      expect(orders.queries.map(({ select }) => select)).toEqual([
        ['id', 'description'],
      ]);
    });

    it('should refuse a read when the actor may read no column', async () => {
      const orders = await ordersWith(only('role:clerk', 'read', []));

      await refusal(orders.find({ ctx: ctxOf(CLERK) }));
      await refusal(orders.find({ select: [], ctx: ctxOf(CLERK) }));
      expect(orders.queries).toEqual([]);
    });

    it('should read the readable columns a caller selects', async () => {
      const orders = await ordersWith(READS);

      await expect(
        orders.findOne({ select: ['description'], ctx: ctxOf(CLERK) }),
      ).resolves.toEqual({ description: ORDER.description });
    });

    it.each<{
      name: string;
      run: (
        orders: MemoryRepositoryFixture<OrderFixture>,
        ctx: PlainLiteralObject,
      ) => Promise<unknown>;
    }>([
      {
        name: 'selecting',
        run: (o, ctx) => o.find({ select: ['id', 'tenantId'], ctx }),
      },
      {
        name: 'filtering on',
        run: (o, ctx) => o.find({ where: Where.eq('tenantId', 'acme'), ctx }),
      },
      {
        name: 'filtering deep inside a compound on',
        run: (o, ctx) =>
          o.findOne({
            where: Where.or(
              Where.eq('id', ORDER.id),
              Where.and(
                Where.eq('description', 'x'),
                Where.eq('tenantId', 'a'),
              ),
            ),
            ctx,
          }),
      },
      {
        name: 'sorting on',
        run: (o, ctx) =>
          o.findAndCount({
            order: [{ field: 'tenantId', order: SortOrder.ASC }],
            ctx,
          }),
      },
      {
        name: 'counting by',
        run: (o, ctx) => o.count({ where: Where.eq('tenantId', 'acme'), ctx }),
      },
    ])(
      'should refuse $name a column the actor may not read',
      async ({ run }) => {
        const orders = await ordersWith(READS);

        const error = await refusal(run(orders, ctxOf(CLERK)));

        expect(error).toMatchObject({
          context: { action: 'read', columns: ['tenantId'] },
        });
        expect(orders.queries).toEqual([]);
      },
    );

    it('should not count the columns row scope adds against the caller', async () => {
      const orders = await ordersWith(READS, { scoped: true });

      await expect(orders.find({ ctx: ctxOf(CLERK, 'acme') })).resolves.toEqual(
        [{ id: ORDER.id, description: ORDER.description }],
      );
    });
  });

  describe('writes', () => {
    it('should write the writable columns, and the primary key', async () => {
      const orders = await ordersWith({
        ...only('role:clerk', 'create', ['tenantId', 'description']),
        ...allow('role:clerk', ORDER_TOKEN, ['read']),
      });

      await expect(
        orders.create(
          { id: 'order-2', tenantId: 'acme', description: 'second' },
          { ctx: ctxOf(CLERK) },
        ),
      ).resolves.toEqual({
        id: 'order-2',
        tenantId: 'acme',
        description: 'second',
        dateDeleted: null,
      });
    });

    it('should refuse a create writing a column the actor may not write', async () => {
      const orders = await ordersWith(
        only('role:clerk', 'create', ['tenantId', 'description']),
      );

      const error = await refusal(
        orders.createMany(
          [
            { id: 'order-2', tenantId: 'acme', description: 'second' },
            { id: 'order-3', description: 'third', dateDeleted: new Date() },
          ],
          { ctx: ctxOf(CLERK) },
        ),
      );

      expect(error).toMatchObject({
        context: { action: 'create', columns: ['dateDeleted'] },
      });
      expect(orders.stored).toEqual([ORDER]);
    });

    it('should refuse an update writing a column the actor may not write', async () => {
      const orders = await ordersWith(
        only('role:clerk', 'update', ['description']),
      );

      await refusal(
        orders.update(ORDER, { tenantId: 'globex' }, { ctx: ctxOf(CLERK) }),
      );
      expect(orders.stored).toEqual([ORDER]);
    });

    it.each<{
      name: string;
      write: (
        orders: MemoryRepositoryFixture<OrderFixture>,
        ctx: AppContextHost,
      ) => Promise<unknown>;
      actions: string[];
    }>([
      {
        name: 'an update',
        actions: ['update'],
        write: (orders, ctx) =>
          orders.update(ORDER, { dateDeleted: new Date() }, { ctx }),
      },
      {
        name: 'an upsert',
        actions: ['create', 'update'],
        write: (orders, ctx) =>
          orders.upsert({ ...ORDER, dateDeleted: new Date() }, { ctx }),
      },
      {
        name: 'a create',
        actions: ['create'],
        write: (orders, ctx) =>
          orders.create(
            { id: 'order-2', tenantId: 'acme', dateDeleted: new Date() },
            { ctx },
          ),
      },
    ])(
      'should refuse $name soft deleting a row the actor may not soft delete',
      async ({ write, actions }) => {
        const orders = await ordersWith(
          allow('role:clerk', ORDER_TOKEN, actions),
        );

        const error = await refusal(write(orders, ctxOf(CLERK)));

        expect(error).toMatchObject({ context: { action: 'softDelete' } });
        expect(orders.stored).toEqual([ORDER]);
      },
    );

    it('should let an actor who may soft delete write the delete date', async () => {
      const orders = await ordersWith(
        allow('role:clerk', ORDER_TOKEN, ['update', 'softDelete']),
      );
      const deleted = new Date();

      await orders.update(
        ORDER,
        { dateDeleted: deleted },
        { ctx: ctxOf(CLERK) },
      );

      expect(orders.stored).toEqual([{ ...ORDER, dateDeleted: deleted }]);
    });

    it('should update the writable columns', async () => {
      const orders = await ordersWith({
        ...only('role:clerk', 'update', ['description']),
        ...allow('role:clerk', ORDER_TOKEN, ['read']),
      });

      await expect(
        orders.update(ORDER, { description: 'changed' }, { ctx: ctxOf(CLERK) }),
      ).resolves.toEqual({ ...ORDER, description: 'changed' });
    });

    it('should refuse a replace when any column is not writable, since it erases what it omits', async () => {
      const orders = await ordersWith(
        only('role:clerk', 'update', ['tenantId', 'description']),
      );

      await refusal(
        orders.replace(
          ORDER,
          { id: ORDER.id, tenantId: 'acme', description: 'changed' },
          { ctx: ctxOf(CLERK) },
        ),
      );
      expect(orders.stored).toEqual([ORDER]);
    });

    it('should replace when every column is writable', async () => {
      const orders = await ordersWith({
        ...only('role:clerk', 'update', [
          'tenantId',
          'description',
          'dateDeleted',
        ]),
        ...allow('role:clerk', ORDER_TOKEN, ['read']),
      });

      await expect(
        orders.replace(
          ORDER,
          { ...ORDER, description: 'changed' },
          { ctx: ctxOf(CLERK) },
        ),
      ).resolves.toEqual({ ...ORDER, description: 'changed' });
    });

    it('should hold an upsert to the columns both create and update allow', async () => {
      const orders = await ordersWith({
        ...only('role:clerk', 'create', ['tenantId', 'description']),
        ...only('role:clerk', 'update', ['description', 'dateDeleted']),
      });

      const error = await refusal(
        orders.upsert(
          { id: ORDER.id, tenantId: 'acme', description: 'changed' },
          { ctx: ctxOf(CLERK) },
        ),
      );

      expect(error).toMatchObject({ context: { columns: ['tenantId'] } });
    });

    it('should not count the columns row scope stamps against the caller', async () => {
      const orders = await ordersWith(
        {
          ...only('role:clerk', 'create', ['description']),
          ...allow('role:clerk', ORDER_TOKEN, ['read']),
        },
        { scoped: true },
      );

      await expect(
        orders.create(
          { id: 'order-2', description: 'second' },
          { ctx: ctxOf(CLERK, 'acme') },
        ),
      ).resolves.toEqual({
        id: 'order-2',
        tenantId: 'acme',
        description: 'second',
        dateDeleted: null,
      });
    });
  });

  describe('write results', () => {
    it('should return the readable columns and the primary key', async () => {
      const orders = await ordersWith({
        ...allow('role:clerk', ORDER_TOKEN, ['update']),
        ...only('role:clerk', 'read', ['description']),
      });

      await expect(
        orders.update(ORDER, { description: 'changed' }, { ctx: ctxOf(CLERK) }),
      ).resolves.toEqual({ id: ORDER.id, description: 'changed' });
      expect(orders.stored).toEqual([{ ...ORDER, description: 'changed' }]);
    });

    it('should return only the primary key to an actor who may not read', async () => {
      const orders = await ordersWith(
        allow('role:clerk', ORDER_TOKEN, ['create', 'delete']),
      );

      await expect(
        orders.create(
          { id: 'order-2', tenantId: 'acme', description: 'second' },
          { ctx: ctxOf(CLERK) },
        ),
      ).resolves.toEqual({ id: 'order-2' });
      await expect(
        orders.delete(ORDER, { ctx: ctxOf(CLERK) }),
      ).resolves.toEqual({ id: ORDER.id });
    });

    it('should return every row of a batch the same way', async () => {
      const orders = await ordersWith({
        ...allow('role:clerk', ORDER_TOKEN, ['create']),
        ...only('role:clerk', 'read', ['tenantId']),
      });

      await expect(
        orders.createMany(
          [
            { id: 'order-2', tenantId: 'acme', description: 'second' },
            { id: 'order-3', tenantId: 'acme', description: 'third' },
          ],
          { ctx: ctxOf(CLERK) },
        ),
      ).resolves.toEqual([
        { id: 'order-2', tenantId: 'acme' },
        { id: 'order-3', tenantId: 'acme' },
      ]);
    });
  });
});
