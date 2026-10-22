import { type Type } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  AppContextHost,
  type AppContextInterface,
  CoreModule,
  type DeepPartial,
  HooksCtx,
  OverlayRef,
} from '@concepta/nestjs-core';

import { type MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import {
  ORDER_TOKEN,
  OrderEntityFixture,
  type OrderFixture,
} from '../../__fixtures__/memory/order.fixture.js';
import { UnknownColumnException } from '../../exceptions/unknown-column.exception.js';
import { type RepositoryFindOptions } from '../../repository/interfaces/repository-options.interface.js';
import { Where } from '../../repository/where.helpers.js';
import { RepositoryModule } from '../../repository.module.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';
import {
  type AfterCountMethod,
  type AfterCreateManyMethod,
  type AfterCreateMethod,
  type AfterDeleteManyMethod,
  type AfterDeleteMethod,
  type AfterDestroyMethod,
  type AfterFindAndCountMethod,
  type AfterFindMethod,
  type AfterFindOneMethod,
  type AfterReadMethod,
  type AfterReplaceMethod,
  type AfterRestoreMethod,
  type AfterSoftDeleteMethod,
  type AfterTransitionMethod,
  type AfterUpdateMethod,
  type AfterUpsertMethod,
  type AfterWriteMethod,
  type BeforeCountMethod,
  type BeforeCreateManyMethod,
  type BeforeCreateMethod,
  type BeforeDeleteManyMethod,
  type BeforeDeleteMethod,
  type BeforeDestroyMethod,
  type BeforeFindAndCountMethod,
  type BeforeFindMethod,
  type BeforeFindOneMethod,
  type BeforeReadMethod,
  type BeforeReplaceMethod,
  type BeforeRestoreMethod,
  type BeforeSoftDeleteMethod,
  type BeforeTransitionMethod,
  type BeforeUpdateMethod,
  type BeforeUpsertMethod,
  type BeforeWriteMethod,
} from '../hook-method.types.js';
import {
  AfterCount,
  AfterCreate,
  AfterCreateMany,
  AfterDelete,
  AfterDeleteMany,
  AfterDestroy,
  AfterFind,
  AfterFindAndCount,
  AfterFindOne,
  AfterRead,
  AfterReplace,
  AfterRestore,
  AfterSoftDelete,
  AfterTransition,
  AfterUpdate,
  AfterUpsert,
  AfterWrite,
  BeforeCount,
  BeforeCreate,
  BeforeCreateMany,
  BeforeDelete,
  BeforeDeleteMany,
  BeforeDestroy,
  BeforeFind,
  BeforeFindAndCount,
  BeforeFindOne,
  BeforeRead,
  BeforeReplace,
  BeforeRestore,
  BeforeSoftDelete,
  BeforeTransition,
  BeforeUpdate,
  BeforeUpsert,
  BeforeWrite,
  RepoHook,
} from '../repository-hook.decorators.js';

type Order = OrderFixture;

/** Checks the exported method types against an implementation. */
interface AllHooksInterface {
  beforeRead: BeforeReadMethod<Order>;
  afterRead: AfterReadMethod<Order>;
  beforeWrite: BeforeWriteMethod<Order>;
  afterWrite: AfterWriteMethod<Order>;
  beforeTransition: BeforeTransitionMethod<Order>;
  afterTransition: AfterTransitionMethod<Order>;
  beforeDestroy: BeforeDestroyMethod<Order>;
  afterDestroy: AfterDestroyMethod<Order>;
  beforeFind: BeforeFindMethod<Order>;
  afterFind: AfterFindMethod<Order>;
  beforeFindOne: BeforeFindOneMethod<Order>;
  afterFindOne: AfterFindOneMethod<Order>;
  beforeCount: BeforeCountMethod<Order>;
  afterCount: AfterCountMethod;
  beforeFindAndCount: BeforeFindAndCountMethod<Order>;
  afterFindAndCount: AfterFindAndCountMethod<Order>;
  beforeCreate: BeforeCreateMethod<Order>;
  afterCreate: AfterCreateMethod<Order>;
  beforeCreateMany: BeforeCreateManyMethod<Order>;
  afterCreateMany: AfterCreateManyMethod<Order>;
  beforeUpdate: BeforeUpdateMethod<Order>;
  afterUpdate: AfterUpdateMethod<Order>;
  beforeUpsert: BeforeUpsertMethod<Order>;
  afterUpsert: AfterUpsertMethod<Order>;
  beforeReplace: BeforeReplaceMethod<Order>;
  afterReplace: AfterReplaceMethod<Order>;
  beforeDelete: BeforeDeleteMethod<Order>;
  afterDelete: AfterDeleteMethod<Order>;
  beforeDeleteMany: BeforeDeleteManyMethod<Order>;
  afterDeleteMany: AfterDeleteManyMethod<Order>;
  beforeSoftDelete: BeforeSoftDeleteMethod<Order>;
  afterSoftDelete: AfterSoftDeleteMethod<Order>;
  beforeRestore: BeforeRestoreMethod<Order>;
  afterRestore: AfterRestoreMethod<Order>;
}

/** Records the name of every hook method it runs, in order. */
@RepoHook()
class AllHooks implements AllHooksInterface {
  calls: string[] = [];

  private pass<T>(name: string, value: T): Promise<T> {
    this.calls.push(name);
    return Promise.resolve(value);
  }

  @BeforeRead() beforeRead(options: RepositoryFindOptions<Order>) {
    return this.pass('beforeRead', options);
  }
  @AfterRead() afterRead(
    result: Order | Order[] | null | number | [Order[], number],
  ) {
    return this.pass('afterRead', result);
  }
  @BeforeWrite() beforeWrite(data: DeepPartial<Order> | DeepPartial<Order>[]) {
    return this.pass('beforeWrite', data);
  }
  @AfterWrite() afterWrite(result: Order | Order[]) {
    return this.pass('afterWrite', result);
  }
  @BeforeTransition() beforeTransition(entity: Order) {
    return this.pass('beforeTransition', entity);
  }
  @AfterTransition() afterTransition(result: Order) {
    return this.pass('afterTransition', result);
  }
  @BeforeDestroy() beforeDestroy(entity: Order) {
    return this.pass('beforeDestroy', entity);
  }
  @AfterDestroy() afterDestroy(result: Order) {
    return this.pass('afterDestroy', result);
  }
  @BeforeFind() beforeFind(options: RepositoryFindOptions<Order>) {
    return this.pass('beforeFind', options);
  }
  @AfterFind() afterFind(result: Order[]) {
    return this.pass('afterFind', result);
  }
  @BeforeFindOne() beforeFindOne(options: RepositoryFindOptions<Order>) {
    return this.pass('beforeFindOne', options);
  }
  @AfterFindOne() afterFindOne(result: Order | null) {
    return this.pass('afterFindOne', result);
  }
  @BeforeCount() beforeCount(options: RepositoryFindOptions<Order>) {
    return this.pass('beforeCount', options);
  }
  @AfterCount() afterCount(result: number) {
    return this.pass('afterCount', result);
  }
  @BeforeFindAndCount() beforeFindAndCount(
    options: RepositoryFindOptions<Order>,
  ) {
    return this.pass('beforeFindAndCount', options);
  }
  @AfterFindAndCount() afterFindAndCount(result: [Order[], number]) {
    return this.pass('afterFindAndCount', result);
  }
  @BeforeCreate() beforeCreate(data: DeepPartial<Order>) {
    return this.pass('beforeCreate', data);
  }
  @AfterCreate() afterCreate(result: Order) {
    return this.pass('afterCreate', result);
  }
  @BeforeCreateMany() beforeCreateMany(data: DeepPartial<Order>[]) {
    return this.pass('beforeCreateMany', data);
  }
  @AfterCreateMany() afterCreateMany(result: Order[]) {
    return this.pass('afterCreateMany', result);
  }
  @BeforeUpdate() beforeUpdate(data: DeepPartial<Order>) {
    return this.pass('beforeUpdate', data);
  }
  @AfterUpdate() afterUpdate(result: Order) {
    return this.pass('afterUpdate', result);
  }
  @BeforeUpsert() beforeUpsert(data: DeepPartial<Order>) {
    return this.pass('beforeUpsert', data);
  }
  @AfterUpsert() afterUpsert(result: Order) {
    return this.pass('afterUpsert', result);
  }
  @BeforeReplace() beforeReplace(data: DeepPartial<Order>) {
    return this.pass('beforeReplace', data);
  }
  @AfterReplace() afterReplace(result: Order) {
    return this.pass('afterReplace', result);
  }
  @BeforeDelete() beforeDelete(entity: Order) {
    return this.pass('beforeDelete', entity);
  }
  @AfterDelete() afterDelete(result: Order) {
    return this.pass('afterDelete', result);
  }
  @BeforeDeleteMany() beforeDeleteMany(entities: Order[]) {
    return this.pass('beforeDeleteMany', entities);
  }
  @AfterDeleteMany() afterDeleteMany(result: Order[]) {
    return this.pass('afterDeleteMany', result);
  }
  @BeforeSoftDelete() beforeSoftDelete(entity: Order) {
    return this.pass('beforeSoftDelete', entity);
  }
  @AfterSoftDelete() afterSoftDelete(result: Order) {
    return this.pass('afterSoftDelete', result);
  }
  @BeforeRestore() beforeRestore(entity: Order) {
    return this.pass('beforeRestore', entity);
  }
  @AfterRestore() afterRestore(result: Order) {
    return this.pass('afterRestore', result);
  }
}

/** A context carrying route-declared hooks, as the interceptor would build. */
const ctxWithHooks = (...hooks: Type[]): AppContextHost => {
  const ctx = new AppContextHost();
  ctx.defineOverlay(HooksCtx, {
    hooks: hooks.map((hook) => ({ hook, type: RepoHook.KEY })),
  });
  return ctx;
};

describe('repository hooks', () => {
  let moduleRef: TestingModule;
  let orders: MemoryRepositoryFixture<Order>;

  const boot = async (...providers: Type[]): Promise<void> => {
    moduleRef = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot(),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: MemoryRepositoryModuleFixture,
              entities: [{ key: ORDER_TOKEN, entity: OrderEntityFixture }],
            },
          ],
        }),
      ],
      providers,
    }).compile();

    orders = moduleRef.get(getDynamicRepositoryToken(ORDER_TOKEN));
  };

  const seed = (description: string, tenantId = 'acme'): Promise<Order> =>
    orders.create({ description, tenantId });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('order of execution', () => {
    let hooks: AllHooks;
    let ctx: AppContextHost;
    let order: Order;

    beforeEach(async () => {
      await boot(AllHooks);
      hooks = moduleRef.get(AllHooks);
      ctx = ctxWithHooks(AllHooks);
      order = await seed('first');
    });

    const cases: [string, () => Promise<unknown>, string[]][] = [
      [
        'find',
        () => orders.find({ ctx }),
        ['beforeRead', 'beforeFind', 'afterFind', 'afterRead'],
      ],
      [
        'findOne',
        () => orders.findOne({ where: Where.eq('id', order.id), ctx }),
        ['beforeRead', 'beforeFindOne', 'afterFindOne', 'afterRead'],
      ],
      [
        'count',
        () => orders.count({ ctx }),
        ['beforeRead', 'beforeCount', 'afterCount'],
      ],
      [
        'findAndCount',
        () => orders.findAndCount({ ctx }),
        ['beforeRead', 'beforeFindAndCount', 'afterFindAndCount'],
      ],
      [
        'create',
        () => orders.create({ description: 'new', tenantId: 'acme' }, { ctx }),
        ['beforeWrite', 'beforeCreate', 'afterCreate', 'afterWrite'],
      ],
      [
        'createMany',
        () =>
          orders.createMany([{ description: 'new', tenantId: 'acme' }], {
            ctx,
          }),
        ['beforeWrite', 'beforeCreateMany', 'afterCreateMany', 'afterWrite'],
      ],
      [
        'update',
        () => orders.update(order, { description: 'renamed' }, { ctx }),
        ['beforeWrite', 'beforeUpdate', 'afterUpdate', 'afterWrite'],
      ],
      [
        'upsert onto a stored row',
        () => orders.upsert({ id: order.id, description: 'revised' }, { ctx }),
        ['beforeWrite', 'beforeUpsert', 'afterUpsert', 'afterWrite'],
      ],
      [
        'upsert as an insert',
        () =>
          orders.upsert(
            { id: 'new-order', description: 'new', tenantId: 'acme' },
            { ctx },
          ),
        ['beforeWrite', 'beforeUpsert', 'afterUpsert', 'afterWrite'],
      ],
      [
        'replace',
        () => orders.replace(order, { description: 'replaced' }, { ctx }),
        ['beforeWrite', 'beforeReplace', 'afterReplace', 'afterWrite'],
      ],
      [
        'delete',
        () => orders.delete(order, { ctx }),
        ['beforeDestroy', 'beforeDelete', 'afterDelete', 'afterDestroy'],
      ],
      [
        'deleteMany',
        () => orders.deleteMany([order], { ctx }),
        [
          'beforeDestroy',
          'beforeDeleteMany',
          'afterDeleteMany',
          'afterDestroy',
        ],
      ],
      [
        'softDelete',
        () => orders.softDelete(order, { ctx }),
        [
          'beforeTransition',
          'beforeSoftDelete',
          'afterSoftDelete',
          'afterTransition',
        ],
      ],
    ];

    it.each(cases)('runs the hooks for %s in order', async (_, run, calls) => {
      await run();

      expect(hooks.calls).toEqual(calls);
    });

    it('runs the hooks for restore in order', async () => {
      await orders.softDelete(order);

      await orders.restore(order, { ctx });

      expect(hooks.calls).toEqual([
        'beforeTransition',
        'beforeRestore',
        'afterRestore',
        'afterTransition',
      ]);
    });

    it('runs the read hooks when nothing is found', async () => {
      expect(
        await orders.findOne({ where: Where.eq('id', 'missing'), ctx }),
      ).toBeNull();

      expect(hooks.calls).toEqual([
        'beforeRead',
        'beforeFindOne',
        'afterFindOne',
        'afterRead',
      ]);
    });

    it('runs no hook when the context declares none', async () => {
      await orders.find();

      expect(hooks.calls).toEqual([]);
    });
  });

  describe('a read hook changing the options', () => {
    it('cannot name a field a caller could not', async () => {
      @RepoHook()
      class WidenHook {
        @BeforeFind()
        async widen(options: RepositoryFindOptions<Order>) {
          return { ...options, where: Where.eq('salary', 1) };
        }
      }
      await boot(WidenHook);

      await expect(
        orders.find({ ctx: ctxWithHooks(WidenHook) }),
      ).rejects.toThrow(UnknownColumnException);
    });
  });

  describe('a write hook changing the data', () => {
    it("keeps the caller's value over a hook's by default", async () => {
      @RepoHook()
      class OverrideHook {
        @BeforeCreate()
        async stamp(data: DeepPartial<Order>) {
          return { ...data, tenantId: 'hook' };
        }
      }
      await boot(OverrideHook);

      const created = await orders.create(
        { description: 'new', tenantId: 'caller' },
        { ctx: ctxWithHooks(OverrideHook) },
      );

      expect(created.tenantId).toBe('caller');
    });

    it("lets a { replace: true } hook override the caller's value", async () => {
      @RepoHook()
      class StampHook {
        @BeforeCreate({ replace: true })
        async stamp(data: DeepPartial<Order>) {
          return { ...data, tenantId: 'hook' };
        }
      }
      await boot(StampHook);

      const created = await orders.create(
        { description: 'new', tenantId: 'caller' },
        { ctx: ctxWithHooks(StampHook) },
      );

      expect(created.tenantId).toBe('hook');
    });

    it('applies a default hook and a { replace: true } hook together', async () => {
      // `calls` proves both ran: a default hook losing to the caller looks the
      // same as one that never ran.
      @RepoHook()
      class MixedHook {
        calls: string[] = [];

        @BeforeCreate()
        async enrich(data: DeepPartial<Order>) {
          this.calls.push('enrich');
          return { ...data, description: 'hook' };
        }

        @BeforeCreate({ replace: true })
        async stamp(data: DeepPartial<Order>) {
          this.calls.push('stamp');
          return { ...data, tenantId: 'hook' };
        }
      }
      await boot(MixedHook);

      const created = await orders.create(
        { description: 'caller', tenantId: 'caller' },
        { ctx: ctxWithHooks(MixedHook) },
      );

      expect(moduleRef.get(MixedHook).calls).toEqual(['enrich', 'stamp']);
      expect(created.description).toBe('caller');
      expect(created.tenantId).toBe('hook');
    });
  });

  it('lets a BeforeFind hook narrow the query', async () => {
    @RepoHook()
    class FilteringHook {
      @BeforeFind()
      async narrow(options: RepositoryFindOptions<Order>) {
        const condition = Where.eq('description', 'second');
        return {
          ...options,
          where: options.where
            ? Where.and(options.where, condition)
            : condition,
        };
      }
    }
    await boot(FilteringHook);
    await seed('first');
    await seed('second');

    const found = await orders.find({ ctx: ctxWithHooks(FilteringHook) });

    expect(found.map((order) => order.description)).toEqual(['second']);
  });

  it('runs several hooks on one method in the order they are declared', async () => {
    const calls: string[] = [];

    @RepoHook()
    class FirstHook {
      @BeforeFind()
      async record(options: RepositoryFindOptions<Order>) {
        calls.push('first');
        return options;
      }
    }

    @RepoHook()
    class SecondHook {
      @BeforeFind()
      async record(options: RepositoryFindOptions<Order>) {
        calls.push('second');
        return options;
      }
    }
    await boot(FirstHook, SecondHook);

    await orders.find({ ctx: ctxWithHooks(FirstHook, SecondHook) });

    expect(calls).toEqual(['first', 'second']);
  });

  // The README's "Defining a Hook" example.
  describe('the README tenant hook', () => {
    const TenantCtx = new OverlayRef<'withTenant', { tenantId: string }>(
      'withTenant',
    );

    @RepoHook()
    class TenantScopeHook {
      @BeforeFind()
      async addTenantFilter(
        options: RepositoryFindOptions<Order>,
        ctx: AppContextInterface,
      ): Promise<RepositoryFindOptions<Order>> {
        const tenant = ctx.require(TenantCtx).withTenant();

        const condition = Where.eq('tenantId', tenant.tenantId);
        return {
          ...options,
          where: options.where
            ? Where.and(options.where, condition)
            : condition,
        };
      }

      @BeforeCreate({ replace: true })
      async stampTenant(
        data: DeepPartial<Order>,
        ctx: AppContextInterface,
      ): Promise<DeepPartial<Order>> {
        const tenant = ctx.require(TenantCtx).withTenant();

        return { ...data, tenantId: tenant.tenantId };
      }
    }

    const tenantCtx = (tenantId: string): AppContextHost => {
      const ctx = ctxWithHooks(TenantScopeHook);
      ctx.defineOverlay(TenantCtx, { tenantId });
      return ctx;
    };

    beforeEach(async () => {
      await boot(TenantScopeHook);
    });

    it("excludes another tenant's rows from a read", async () => {
      await seed('orlando order', 'orlando');
      await seed('tampa order', 'tampa');

      const found = await orders.find({ ctx: tenantCtx('orlando') });

      expect(found.map((order) => order.description)).toEqual([
        'orlando order',
      ]);
    });

    it('overrides a tenant the caller supplied on create', async () => {
      const created = await orders.create(
        { description: 'new', tenantId: 'tampa' },
        { ctx: tenantCtx('orlando') },
      );

      expect(created.tenantId).toBe('orlando');
    });
  });
});
