import { Module } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  type Actor,
  ActorCtx,
  AppContextHost,
  CoreModule,
} from '@concepta/nestjs-core';

import {
  ACTIVITY_TOKEN,
  ActivityEntityFixture,
  type ActivityFixture,
  WIDGET_TOKEN,
  WidgetEntityFixture,
  type WidgetFixture,
} from '../../__fixtures__/memory/activity.fixture.js';
import {
  actorCtx,
  allow,
  AuthorityFixture,
} from '../../__fixtures__/memory/authority.fixture.js';
import { type MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import { OrderRowScopeFixture } from '../../__fixtures__/memory/order-row-scope.fixture.js';
import {
  ORDER_TOKEN,
  OrderEntityFixture,
  type OrderFixture,
} from '../../__fixtures__/memory/order.fixture.js';
import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
import { Where } from '../../repository/where.helpers.js';
import { RepositoryModule } from '../../repository.module.js';
import { RowScopeCtx } from '../../row-scope/interfaces/row-scope-context.interface.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';
import { AuthorityRefusedException } from '../exceptions/authority-refused.exception.js';

const GOVERNED = {
  access: 'governed',
  authority: AuthorityFixture,
} as const;

const ADMIN: Actor = { kind: 'role', roles: ['admin'] };
const CLERK: Actor = { kind: 'role', roles: ['clerk'] };

const WIDGET_COLUMNS = ['id', 'name', 'color', 'secret', 'dateDeleted'];
const ORDER_COLUMNS = ['id', 'tenantId', 'description', 'dateDeleted'];

async function compile(
  entities: RepositoryProviderOptions[],
  authority: AuthorityFixture,
): Promise<TestingModule> {
  @Module({
    providers: [
      { provide: AuthorityFixture, useValue: authority },
      OrderRowScopeFixture,
    ],
    exports: [AuthorityFixture, OrderRowScopeFixture],
  })
  class DecidersModule {}

  return Test.createTestingModule({
    imports: [
      CoreModule.forRoot({}),
      RepositoryModule.forRoot({
        imports: [DecidersModule],
        drivers: [{ driver: MemoryRepositoryModuleFixture, entities }],
      }),
    ],
  }).compile();
}

describe('calls the repository makes itself', () => {
  describe('activity records', () => {
    const entities: RepositoryProviderOptions[] = [
      {
        key: WIDGET_TOKEN,
        entity: WidgetEntityFixture,
        authority: GOVERNED,
        activity: { store: ACTIVITY_TOKEN },
      },
      {
        key: ACTIVITY_TOKEN,
        entity: ActivityEntityFixture,
        authority: GOVERNED,
        writePolicy: { access: 'append-only', reason: 'an audit log' },
      },
    ];

    async function start() {
      const authority = new AuthorityFixture({
        ...allow('role:clerk', WIDGET_TOKEN, ['create']),
        ...allow('role:admin', ACTIVITY_TOKEN, ['read']),
      });
      const moduleRef = await compile(entities, authority);
      return {
        authority,
        widgets: moduleRef.get<MemoryRepositoryFixture<WidgetFixture>>(
          getDynamicRepositoryToken(WIDGET_TOKEN),
        ),
        store: moduleRef.get<MemoryRepositoryFixture<ActivityFixture>>(
          getDynamicRepositoryToken(ACTIVITY_TOKEN),
        ),
      };
    }

    it('should record a decided write without deciding the record', async () => {
      const { authority, widgets, store } = await start();

      await widgets.create(
        { id: 'widget-1', name: 'first' },
        { ctx: actorCtx(CLERK) },
      );

      expect(store.stored.map(({ recordId }) => recordId)).toEqual([
        'widget-1',
      ]);
      expect(authority.requests).toEqual([
        {
          actor: CLERK,
          object: WIDGET_TOKEN,
          action: 'create',
          columns: WIDGET_COLUMNS,
        },
        {
          actor: CLERK,
          object: WIDGET_TOKEN,
          action: 'read',
          columns: WIDGET_COLUMNS,
        },
      ]);
    });

    it('should decide a caller writing the store directly', async () => {
      const { store } = await start();

      await expect(
        store.createMany(
          [
            {
              id: 'forged',
              entityKey: WIDGET_TOKEN,
              urn: 'urn:memory:Widget',
              operation: 'create',
              recordId: 'widget-1',
              changed: [],
              values: null,
              occurredAt: new Date(),
              correlationId: null,
            },
          ],
          { ctx: actorCtx(CLERK) },
        ),
      ).rejects.toThrow(AuthorityRefusedException);
      expect(store.stored).toEqual([]);
    });

    it('should decide a read of the records as its caller', async () => {
      const { widgets, store } = await start();
      await widgets.create(
        { id: 'widget-1', name: 'first' },
        { ctx: actorCtx(CLERK) },
      );

      await expect(store.find({ ctx: actorCtx(CLERK) })).rejects.toThrow(
        AuthorityRefusedException,
      );
      await expect(store.find({ ctx: actorCtx(ADMIN) })).resolves.toHaveLength(
        1,
      );
    });
  });

  describe("row scope's check that a row is the caller's", () => {
    const ORDER: OrderFixture = {
      id: 'order-1',
      tenantId: 'acme',
      description: 'first',
      dateDeleted: null,
    };

    const scopedCtx = (actor: Actor, tenantId: string): AppContextHost => {
      const ctx = new AppContextHost();
      ctx.defineOverlay(RowScopeCtx, { tenantId }, { immutable: true });
      ctx.defineOverlay(ActorCtx, actor, { immutable: true });
      return ctx;
    };

    async function start() {
      const authority = new AuthorityFixture({
        ...allow('role:admin', ORDER_TOKEN, ['create']),
        ...allow('role:clerk', ORDER_TOKEN, ['update']),
      });
      const moduleRef = await compile(
        [
          {
            key: ORDER_TOKEN,
            entity: OrderEntityFixture,
            authority: GOVERNED,
            rowScope: { access: 'scoped', resolver: OrderRowScopeFixture },
          },
        ],
        authority,
      );
      await moduleRef.init();
      const orders = moduleRef.get<MemoryRepositoryFixture<OrderFixture>>(
        getDynamicRepositoryToken(ORDER_TOKEN),
      );
      await orders.create(ORDER, { ctx: scopedCtx(ADMIN, 'acme') });
      authority.requests.length = 0;
      return { authority, orders };
    }

    it('should let an actor who may only update update a row of theirs', async () => {
      const { authority, orders } = await start();

      await expect(
        orders.update(
          ORDER,
          { description: 'changed' },
          { ctx: scopedCtx(CLERK, 'acme') },
        ),
      ).resolves.toEqual({ id: ORDER.id });
      expect(orders.stored).toEqual([{ ...ORDER, description: 'changed' }]);
      expect(authority.requests).toEqual([
        {
          actor: CLERK,
          object: ORDER_TOKEN,
          action: 'update',
          columns: ORDER_COLUMNS,
        },
        {
          actor: CLERK,
          object: ORDER_TOKEN,
          action: 'read',
          columns: ORDER_COLUMNS,
        },
      ]);
    });

    it('should still refuse a row outside their scope', async () => {
      const { orders } = await start();

      await expect(
        orders.update(
          ORDER,
          { description: 'changed' },
          { ctx: scopedCtx(CLERK, 'globex') },
        ),
      ).rejects.toThrow('Order not found');
    });

    it('should decide the same actor reading the row themselves', async () => {
      const { orders } = await start();

      await expect(
        orders.findOne({
          where: Where.eq('id', ORDER.id),
          ctx: scopedCtx(CLERK, 'acme'),
        }),
      ).rejects.toThrow(AuthorityRefusedException);
    });
  });
});
