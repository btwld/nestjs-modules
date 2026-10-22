import {
  type DynamicModule,
  HttpStatus,
  Module,
  type PlainLiteralObject,
  type Provider,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  AppContextHost,
  CoreModule,
  CorrelationCtx,
  type DeepPartial,
  HooksCtx,
} from '@concepta/nestjs-core';

import {
  ACTIVITY_TOKEN,
  ActivityEntityFixture,
  type ActivityFixture,
  PAIR_TOKEN,
  PairEntityFixture,
  TENANT_ACTIVITY_TOKEN,
  TenantActivityEntityFixture,
  type TenantActivityFixture,
  WIDGET_METADATA,
  WIDGET_TOKEN,
  WidgetEntityFixture,
  type WidgetFixture,
} from '../../__fixtures__/memory/activity.fixture.js';
import {
  INVOICE_LINE_TOKEN,
  INVOICE_TOKEN,
  InvoiceEntityFixture,
  type InvoiceFixture,
  InvoiceLineEntityFixture,
  TenantRowScopeFixture,
} from '../../__fixtures__/memory/cascade.fixture.js';
import { MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import { type TenantScopeFixture } from '../../__fixtures__/memory/order-row-scope.fixture.js';
import { RepositoryQueryException } from '../../exceptions/repository-query.exception.js';
import { UnknownColumnException } from '../../exceptions/unknown-column.exception.js';
import {
  BeforeCreateMany,
  BeforeUpdate,
  RepoHook,
} from '../../hooks/repository-hook.decorators.js';
import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
import { RepositoryModule } from '../../repository.module.js';
import { RowScopeCtx } from '../../row-scope/interfaces/row-scope-context.interface.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';
import { ActivityBootException } from '../exceptions/activity-boot.exception.js';
import { ActivityWriteException } from '../exceptions/activity-write.exception.js';
import { type ActivityRegistration } from '../interfaces/activity-registration.interface.js';

const APPEND_ONLY = { access: 'append-only', reason: 'activity log' } as const;

const TENANT_SCOPED = {
  access: 'scoped',
  resolver: TenantRowScopeFixture,
} as const;

const tenantCtx = (scope: TenantScopeFixture): AppContextHost => {
  const ctx = new AppContextHost();
  ctx.defineOverlay(RowScopeCtx, scope, { immutable: true });
  return ctx;
};

const STORE: RepositoryProviderOptions = {
  key: ACTIVITY_TOKEN,
  entity: ActivityEntityFixture,
  writePolicy: APPEND_ONLY,
  rowScope: { access: 'public', reason: 'every tenant reads the test log' },
};

const TENANT_STORE: RepositoryProviderOptions = {
  key: TENANT_ACTIVITY_TOKEN,
  entity: TenantActivityEntityFixture,
  writePolicy: APPEND_ONLY,
  rowScope: TENANT_SCOPED,
};

const widgets = (
  activity?: ActivityRegistration,
): RepositoryProviderOptions => ({
  key: WIDGET_TOKEN,
  entity: WidgetEntityFixture,
  activity,
});

/** Stamps the actor on every record, as an implementer's store hook would. */
@RepoHook()
class ActorHook {
  @BeforeCreateMany()
  async stamp(
    records: DeepPartial<ActivityFixture>[],
  ): Promise<DeepPartial<ActivityFixture>[]> {
    return records.map((record) => ({ ...record, actorId: 'user-1' }));
  }
}

/** Adds a column the caller did not name to every widget update. */
@RepoHook()
class PaintHook {
  @BeforeUpdate()
  async paint(
    data: DeepPartial<WidgetFixture>,
  ): Promise<DeepPartial<WidgetFixture>> {
    return { ...data, color: 'red' };
  }
}

@Module({
  providers: [TenantRowScopeFixture],
  exports: [TenantRowScopeFixture],
})
class ResolverModule {}

function compile(
  entities: RepositoryProviderOptions[],
  providers: Provider[] = [],
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      CoreModule.forRoot(),
      RepositoryModule.forRoot({
        imports: [ResolverModule],
        drivers: [{ driver: MemoryRepositoryModuleFixture, entities }],
      }),
    ],
    providers,
  }).compile();
}

describe('activity', () => {
  let moduleRef: TestingModule;
  let widgetRepo: MemoryRepositoryFixture<WidgetFixture>;
  let store: MemoryRepositoryFixture<ActivityFixture>;

  const start = async (
    entities: RepositoryProviderOptions[],
    providers: Provider[] = [],
  ): Promise<void> => {
    moduleRef = await compile(entities, providers);
    await moduleRef.init();
    widgetRepo = moduleRef.get(getDynamicRepositoryToken(WIDGET_TOKEN));
    store = moduleRef.get(getDynamicRepositoryToken(ACTIVITY_TOKEN));
  };

  afterEach(async () => {
    await moduleRef?.close();
  });

  describe('one record per stored row a write altered', () => {
    beforeEach(() => start([widgets({ store: ACTIVITY_TOKEN }), STORE]));

    it('records a create with every own column it stored', async () => {
      const widget = await widgetRepo.create({ name: 'a' });

      expect(store.stored).toHaveLength(1);
      const [record] = store.stored;
      expect(record).toEqual({
        id: expect.any(String),
        entityKey: WIDGET_TOKEN,
        urn: WIDGET_METADATA.urn,
        operation: 'create',
        recordId: widget.id,
        changed: ['id', 'name'],
        values: null,
        occurredAt: expect.any(Date),
        correlationId: null,
      });
    });

    it('records an update with the columns its payload named, less the key', async () => {
      const widget = await widgetRepo.create({ name: 'a' });
      await widgetRepo.update(widget, { id: widget.id, name: 'b' });

      expect(store.stored[1]).toEqual(
        expect.objectContaining({
          operation: 'update',
          recordId: widget.id,
          changed: ['name'],
        }),
      );
    });

    it('records an upsert with the columns its payload named, less the key', async () => {
      const widget = await widgetRepo.create({ name: 'a' });
      await widgetRepo.upsert({ id: widget.id, color: 'blue' });

      expect(store.stored[1]).toEqual(
        expect.objectContaining({ operation: 'upsert', changed: ['color'] }),
      );
    });

    it('records a replace with every own column of the replaced row', async () => {
      const widget = await widgetRepo.create({ name: 'a' });
      await widgetRepo.replace(widget, { name: 'b', color: 'blue' });

      expect(store.stored[1]).toEqual(
        expect.objectContaining({
          operation: 'replace',
          changed: ['id', 'name', 'color'],
        }),
      );
    });

    it('records a delete with no changed columns', async () => {
      const widget = await widgetRepo.create({ name: 'a' });
      await widgetRepo.delete(widget);

      expect(store.stored[1]).toEqual(
        expect.objectContaining({
          operation: 'delete',
          recordId: widget.id,
          changed: [],
          values: null,
        }),
      );
    });

    it('records a soft delete and a restore by the delete-date column', async () => {
      const widget = await widgetRepo.create({ name: 'a' });
      const deleted = await widgetRepo.softDelete(widget);
      await widgetRepo.restore(deleted);

      expect(store.stored.slice(1)).toEqual([
        expect.objectContaining({
          operation: 'softDelete',
          changed: ['dateDeleted'],
        }),
        expect.objectContaining({
          operation: 'restore',
          changed: ['dateDeleted'],
        }),
      ]);
    });

    it('records each row of a createMany and a deleteMany, by its own key', async () => {
      const created = await widgetRepo.createMany([
        { name: 'a' },
        { name: 'b' },
      ]);
      await widgetRepo.deleteMany(created);

      expect(
        store.stored.map(({ operation, recordId }) => [operation, recordId]),
      ).toEqual([
        ['create', created[0]?.id],
        ['create', created[1]?.id],
        ['delete', created[0]?.id],
        ['delete', created[1]?.id],
      ]);
    });

    it('records nothing for a read, a refused write, or an already soft-deleted row', async () => {
      const widget = await widgetRepo.create({ name: 'a' });
      const deleted = await widgetRepo.softDelete(widget);
      const unknownColumn: PlainLiteralObject = { id: widget.id, size: 3 };

      await widgetRepo.find();
      await expect(widgetRepo.update(widget, unknownColumn)).rejects.toThrow(
        UnknownColumnException,
      );
      await widgetRepo.softDelete(deleted);

      expect(store.stored.map(({ operation }) => operation)).toEqual([
        'create',
        'softDelete',
      ]);
    });

    // A restore always writes, so it is always recorded: the row handed in
    // cannot say whether the stored row was deleted.
    it('records a restore handed a copy of the row from before it was deleted', async () => {
      const widget = await widgetRepo.create({ name: 'a' });
      await widgetRepo.softDelete(widget);

      await widgetRepo.restore(widget);

      expect(widgetRepo.stored[0]?.dateDeleted).toBeNull();
      expect(store.stored.map(({ operation }) => operation)).toEqual([
        'create',
        'softDelete',
        'restore',
      ]);
    });

    it('records a restore of a row that was never deleted', async () => {
      const widget = await widgetRepo.create({ name: 'a' });

      await widgetRepo.restore(widget);

      expect(store.stored[1]).toEqual(
        expect.objectContaining({
          operation: 'restore',
          recordId: widget.id,
          changed: ['dateDeleted'],
        }),
      );
    });

    it('carries the correlation id the caller ctx holds', async () => {
      const ctx = new AppContextHost();
      ctx.defineOverlay(CorrelationCtx, {
        correlationId: 'req-1',
        causationId: 'req-1',
      });

      await widgetRepo.create({ name: 'a' }, { ctx });

      expect(store.stored[0]?.correlationId).toEqual('req-1');
    });

    // The ctx is what carries the caller's transaction, so this is what puts
    // the record in it.
    it("writes the record with the caller's ctx", async () => {
      const createMany = vi.spyOn(store, 'createMany');
      const ctx = new AppContextHost();

      await widgetRepo.create({ name: 'a' }, { ctx });

      expect(createMany).toHaveBeenCalledWith(expect.any(Array), { ctx });
    });
  });

  describe('values', () => {
    it('records the new value of each changed column, less those omitted', async () => {
      await start([
        widgets({ store: ACTIVITY_TOKEN, values: true, omit: ['secret'] }),
        STORE,
      ]);

      const widget = await widgetRepo.create({ name: 'a', secret: 's' });
      const updated = await widgetRepo.update(widget, {
        id: widget.id,
        name: 'b',
        secret: 't',
      });
      const deleted = await widgetRepo.softDelete(updated);
      await widgetRepo.delete(await widgetRepo.restore(deleted));

      expect(
        store.stored.map(({ changed, values }) => ({ changed, values })),
      ).toEqual([
        {
          changed: ['id', 'name', 'secret'],
          values: { id: widget.id, name: 'a' },
        },
        { changed: ['name', 'secret'], values: { name: 'b' } },
        {
          changed: ['dateDeleted'],
          values: { dateDeleted: expect.any(Date) },
        },
        { changed: ['dateDeleted'], values: { dateDeleted: null } },
        { changed: [], values: null },
      ]);
    });
  });

  describe('hooks', () => {
    it("records a column a hook added to the logged entity's write", async () => {
      await start(
        [{ ...widgets({ store: ACTIVITY_TOKEN }), hooks: [PaintHook] }, STORE],
        [PaintHook],
      );

      const widget = await widgetRepo.create({ name: 'a' });
      await widgetRepo.update(widget, { id: widget.id, name: 'b' });

      expect(store.stored[1]?.changed).toEqual(['name', 'color']);
    });

    it("runs the store's own hooks on every record", async () => {
      await start(
        [widgets({ store: ACTIVITY_TOKEN }), { ...STORE, hooks: [ActorHook] }],
        [ActorHook],
      );

      await widgetRepo.create({ name: 'a' });

      expect(store.stored[0]?.actorId).toEqual('user-1');
    });

    it('runs a route hook the caller ctx carries on the store write too', async () => {
      await start([widgets({ store: ACTIVITY_TOKEN }), STORE], [ActorHook]);
      const ctx = new AppContextHost();
      ctx.defineOverlay(HooksCtx, {
        hooks: [{ hook: ActorHook, type: RepoHook.KEY }],
      });

      await widgetRepo.create({ name: 'a' }, { ctx });

      expect(store.stored[0]?.actorId).toEqual('user-1');
    });
  });

  describe('related writes and row scope', () => {
    const invoices = (
      activity?: ActivityRegistration,
    ): RepositoryProviderOptions => ({
      key: INVOICE_TOKEN,
      entity: InvoiceEntityFixture,
      rowScope: TENANT_SCOPED,
      relations: { lines: { cascade: true } },
      activity,
    });

    const lines = (
      activity?: ActivityRegistration,
    ): RepositoryProviderOptions => ({
      key: INVOICE_LINE_TOKEN,
      entity: InvoiceLineEntityFixture,
      rowScope: TENANT_SCOPED,
      activity,
    });

    const ACME = tenantCtx({ tenantId: 'acme' });

    it('records a cascaded row only through its own registration', async () => {
      await start([
        invoices({ store: ACTIVITY_TOKEN }),
        lines(),
        widgets(),
        STORE,
      ]);
      const invoiceRepo: MemoryRepositoryFixture<InvoiceFixture> =
        moduleRef.get(getDynamicRepositoryToken(INVOICE_TOKEN));

      await invoiceRepo.create(
        { number: 'A-1', lines: [{ sku: 'widget' }, { sku: 'gear' }] },
        { ctx: ACME },
      );
      expect(store.stored.map(({ entityKey }) => entityKey)).toEqual([
        INVOICE_TOKEN,
      ]);
    });

    it('records the cascaded rows when their own entity is recorded', async () => {
      await start([
        invoices({ store: ACTIVITY_TOKEN }),
        lines({ store: ACTIVITY_TOKEN }),
        widgets(),
        STORE,
      ]);
      const invoiceRepo: MemoryRepositoryFixture<InvoiceFixture> =
        moduleRef.get(getDynamicRepositoryToken(INVOICE_TOKEN));

      await invoiceRepo.create(
        { number: 'A-1', lines: [{ sku: 'widget' }, { sku: 'gear' }] },
        { ctx: ACME },
      );

      expect(store.stored.map(({ entityKey }) => entityKey)).toEqual([
        INVOICE_TOKEN,
        INVOICE_LINE_TOKEN,
        INVOICE_LINE_TOKEN,
      ]);
    });

    it('records the scope columns the resolver stamped on an update', async () => {
      await start([
        invoices({ store: ACTIVITY_TOKEN }),
        lines(),
        widgets(),
        STORE,
      ]);
      const invoiceRepo: MemoryRepositoryFixture<InvoiceFixture> =
        moduleRef.get(getDynamicRepositoryToken(INVOICE_TOKEN));

      const invoice = await invoiceRepo.create(
        { number: 'A-1' },
        { ctx: ACME },
      );
      await invoiceRepo.update(
        invoice,
        { id: invoice.id, number: 'A-2' },
        { ctx: ACME },
      );

      expect(store.stored[1]?.changed).toEqual(['number', 'tenantId']);
    });

    it("stamps a scoped store's record with the caller's scope", async () => {
      await start([
        invoices({ store: TENANT_ACTIVITY_TOKEN }),
        lines(),
        widgets(),
        STORE,
        TENANT_STORE,
      ]);
      const invoiceRepo: MemoryRepositoryFixture<InvoiceFixture> =
        moduleRef.get(getDynamicRepositoryToken(INVOICE_TOKEN));
      const tenantStore: MemoryRepositoryFixture<TenantActivityFixture> =
        moduleRef.get(getDynamicRepositoryToken(TENANT_ACTIVITY_TOKEN));

      await invoiceRepo.create({ number: 'A-1' }, { ctx: ACME });

      expect(tenantStore.stored.map(({ tenantId }) => tenantId)).toEqual([
        'acme',
      ]);
    });
  });

  describe('a record that cannot be stored', () => {
    it("fails the write with the store's refusal status, the change already stored", async () => {
      await start([
        widgets({ store: TENANT_ACTIVITY_TOKEN }),
        STORE,
        TENANT_STORE,
      ]);

      const failure = widgetRepo.create(
        { name: 'a' },
        { ctx: new AppContextHost() },
      );

      await expect(failure).rejects.toThrow(ActivityWriteException);
      await expect(failure).rejects.toMatchObject({
        httpStatus: HttpStatus.FORBIDDEN,
      });
      // No transaction was open, so nothing undid the change.
      expect(widgetRepo.stored).toHaveLength(1);
    });

    it('fails the write as a server error when the store breaks', async () => {
      await start([widgets({ store: ACTIVITY_TOKEN }), STORE]);
      vi.spyOn(store, 'createMany').mockRejectedValueOnce(
        new Error('disk full'),
      );

      const failure = widgetRepo.create({ name: 'a' });

      await expect(failure).rejects.toThrow(ActivityWriteException);
      await expect(failure).rejects.toMatchObject({
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        fault: 'internal',
      });
    });
  });

  describe('startup refusals', () => {
    const boot = async (entities: RepositoryProviderOptions[]) => {
      const compiled = await compile(entities);
      await compiled.close();
    };

    it.each<[string, RepositoryProviderOptions[], RegExp]>([
      [
        'an unregistered store',
        [widgets({ store: 'nowhere' }), STORE],
        /names store "nowhere", which is not registered/,
      ],
      [
        'the entity as its own store',
        [widgets({ store: WIDGET_TOKEN }), STORE],
        /cannot name its own entity as the store/,
      ],
      [
        'a store that is itself recorded',
        [
          widgets({ store: TENANT_ACTIVITY_TOKEN }),
          { ...TENANT_STORE, activity: { store: ACTIVITY_TOKEN } },
          STORE,
        ],
        /which is itself recorded/,
      ],
      [
        'a store that is not append-only',
        [
          widgets({ store: ACTIVITY_TOKEN }),
          { key: ACTIVITY_TOKEN, entity: ActivityEntityFixture },
        ],
        /which is not append-only/,
      ],
      [
        'a store with no row scope declared for a scoped entity',
        [
          {
            key: INVOICE_TOKEN,
            entity: InvoiceEntityFixture,
            rowScope: TENANT_SCOPED,
            activity: { store: ACTIVITY_TOKEN },
          },
          {
            key: ACTIVITY_TOKEN,
            entity: ActivityEntityFixture,
            writePolicy: APPEND_ONLY,
          },
        ],
        /declares no rowScope while Invoice is scoped/,
      ],
      [
        'a store without every activity column',
        [
          widgets({ store: PAIR_TOKEN }),
          {
            key: PAIR_TOKEN,
            entity: PairEntityFixture,
            writePolicy: APPEND_ONLY,
          },
        ],
        /lacks columns: entityKey, urn, operation/,
      ],
      [
        'omitted columns without values',
        [widgets({ store: ACTIVITY_TOKEN, omit: ['secret'] }), STORE],
        /omits columns but records no values/,
      ],
      [
        'an omitted column the entity does not have',
        [
          widgets({ store: ACTIVITY_TOKEN, values: true, omit: ['size'] }),
          STORE,
        ],
        /omits "size", which is not a column of Widget/,
      ],
      [
        'an entity with a composite primary key',
        [
          {
            key: PAIR_TOKEN,
            entity: PairEntityFixture,
            activity: { store: ACTIVITY_TOKEN },
          },
          STORE,
        ],
        /needs a single-column primary key, and has 2 key columns/,
      ],
    ])('refuses %s', async (_label, entities, message) => {
      const failure = boot(entities);
      await expect(failure).rejects.toThrow(ActivityBootException);
      await expect(failure).rejects.toThrow(message);
    });
  });
});

/** A driver that loses the last row of every batch write. */
class LossyWidgetRepository extends MemoryRepositoryFixture<WidgetFixture> {
  protected async doCreateMany(
    entities: DeepPartial<WidgetFixture>[],
  ): Promise<WidgetFixture[]> {
    return (await super.doCreateMany(entities)).slice(0, -1);
  }

  protected async doDeleteMany(
    entities: WidgetFixture[],
  ): Promise<WidgetFixture[]> {
    return (await super.doDeleteMany(entities)).slice(0, -1);
  }
}

@Module({})
class LossyDriverModule {
  static register(entities: { key: string }[]): DynamicModule {
    return {
      module: LossyDriverModule,
      providers: entities.map(({ key }) => ({
        provide: getDynamicRepositoryToken(key),
        useFactory: () => new LossyWidgetRepository(key, WIDGET_METADATA),
      })),
    };
  }
}

describe('batch writes', () => {
  let moduleRef: TestingModule;
  let widgetRepo: LossyWidgetRepository;

  const start = async (activity?: ActivityRegistration): Promise<void> => {
    moduleRef = await Test.createTestingModule({
      imports: [
        RepositoryModule.forRoot({
          drivers: [
            { driver: LossyDriverModule, entities: [widgets(activity)] },
            { driver: MemoryRepositoryModuleFixture, entities: [STORE] },
          ],
        }),
      ],
    }).compile();
    await moduleRef.init();
    widgetRepo = moduleRef.get(getDynamicRepositoryToken(WIDGET_TOKEN));
  };

  afterEach(async () => {
    await moduleRef.close();
  });

  it.each<[string, ActivityRegistration | undefined]>([
    ['a recorded entity', { store: ACTIVITY_TOKEN }],
    ['an entity that is not recorded', undefined],
  ])(
    'refuses a driver result without one row per input, for %s',
    async (_label, activity) => {
      await start(activity);
      const rows: PlainLiteralObject[] = [{ name: 'a' }, { name: 'b' }];

      await expect(widgetRepo.createMany(rows)).rejects.toThrow(
        RepositoryQueryException,
      );

      const first = await widgetRepo.create({ name: 'a' });
      const second = await widgetRepo.create({ name: 'b' });
      await expect(widgetRepo.deleteMany([first, second])).rejects.toThrow(
        RepositoryQueryException,
      );
    },
  );
});
