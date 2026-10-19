import {
  type DynamicModule,
  HttpStatus,
  Injectable,
  Module,
  type ModuleMetadata,
  Scope,
  type Type,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppContextHost, CoreModule } from '@concepta/nestjs-core';

import { type MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import { OrderLineRowScopeFixture } from '../../__fixtures__/memory/order-line-row-scope.fixture.js';
import {
  JoinableTenantRowScopeFixture,
  OrderRowScopeFixture,
  OrgRowScopeFixture,
  OtherJoinableTenantRowScopeFixture,
  type TenantScopeFixture,
} from '../../__fixtures__/memory/order-row-scope.fixture.js';
import {
  ORDER_LINE_TOKEN,
  ORDER_TOKEN,
  OrderEntityFixture,
  type OrderFixture,
  OrderLineEntityFixture,
  type OrderLineFixture,
  TenantOrderLineEntityFixture,
} from '../../__fixtures__/memory/order.fixture.js';
import { RelationWriteException } from '../../exceptions/relation-write.exception.js';
import { RepositoryBootException } from '../../exceptions/repository-boot.exception.js';
import { RepositoryUnboundException } from '../../exceptions/repository-unbound.exception.js';
import {
  BeforeRead,
  RepoHook,
} from '../../hooks/repository-hook.decorators.js';
import { type RepositoryModuleOptionsInterface } from '../../interfaces/repository-module-options.interface.js';
import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
import { type RepositoryFindOptions } from '../../repository/interfaces/repository-options.interface.js';
import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import { Where } from '../../repository/where.helpers.js';
import { RepositoryModule } from '../../repository.module.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';
import { RowScopeBootException } from '../exceptions/row-scope-boot.exception.js';
import { RowScopeCtx } from '../interfaces/row-scope-context.interface.js';
import {
  type RowScopeInterface,
  type RowScopeQueryParams,
} from '../interfaces/row-scope.interface.js';

const ctxFor = (scope: TenantScopeFixture): AppContextHost => {
  const ctx = new AppContextHost();
  ctx.defineOverlay(RowScopeCtx, scope, { immutable: true });
  return ctx;
};

/** The refusal a join of a line's `order` gets, from any source. */
const JOIN_REFUSAL = {
  httpStatus: HttpStatus.BAD_REQUEST,
  fault: 'client',
  message:
    'Cannot join "order" of OrderLine: the rows it reads have a row scope, ' +
    'which a join would bypass. Read them through their own repository.',
};

const ACME = ctxFor({ tenantId: 'acme' });
const GLOBEX = ctxFor({ tenantId: 'globex' });
const ADMIN = ctxFor({ tenantId: 'acme', role: 'admin' });

@Module({
  imports: [RepositoryModule.forFeature([ORDER_TOKEN, ORDER_LINE_TOKEN])],
  providers: [OrderRowScopeFixture, OrderLineRowScopeFixture],
  exports: [OrderRowScopeFixture, OrderLineRowScopeFixture],
})
class ResolverModule {}

const SCOPED: RepositoryProviderOptions[] = [
  {
    key: ORDER_TOKEN,
    entity: OrderEntityFixture,
    rowScope: { access: 'scoped', resolver: OrderRowScopeFixture },
  },
  {
    key: ORDER_LINE_TOKEN,
    entity: OrderLineEntityFixture,
    rowScope: { access: 'scoped', resolver: OrderLineRowScopeFixture },
  },
];

async function compile(
  entities: RepositoryProviderOptions[],
  moduleOptions: RepositoryModuleOptionsInterface = {},
  imports: ModuleMetadata['imports'] = [ResolverModule],
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      RepositoryModule.forRoot({
        ...moduleOptions,
        imports,
        drivers: [{ driver: MemoryRepositoryModuleFixture, entities }],
      }),
    ],
  }).compile();
}

describe('row scope bound through RepositoryModule.forRoot', () => {
  let moduleRef: TestingModule;
  let orders: MemoryRepositoryFixture<OrderFixture>;
  let orderLines: MemoryRepositoryFixture<OrderLineFixture>;
  let acmeOrder: OrderFixture;
  let globexOrder: OrderFixture;

  beforeEach(async () => {
    moduleRef = await compile(SCOPED);
    await moduleRef.init();

    orders = moduleRef.get(getDynamicRepositoryToken(ORDER_TOKEN));
    orderLines = moduleRef.get(getDynamicRepositoryToken(ORDER_LINE_TOKEN));

    acmeOrder = await orders.create({ description: 'acme' }, { ctx: ACME });
    globexOrder = await orders.create(
      { description: 'globex' },
      { ctx: GLOBEX },
    );
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  const storedOrders = () =>
    orders.stored.map(({ description, tenantId }) => ({
      description,
      tenantId,
    }));

  it('stamps each create and scopes reads to the caller', async () => {
    expect(storedOrders()).toEqual([
      { description: 'acme', tenantId: 'acme' },
      { description: 'globex', tenantId: 'globex' },
    ]);
    expect(
      (await orders.find({ ctx: ACME })).map((order) => order.description),
    ).toEqual(['acme']);
  });

  // The scope pre-check has to find the caller's own row through the scoped
  // read, or each of these would be refused as not found.
  describe("writes to the caller's own row", () => {
    it('updates it', async () => {
      await orders.update(acmeOrder, { description: 'renamed' }, { ctx: ACME });

      expect(storedOrders()).toEqual([
        { description: 'renamed', tenantId: 'acme' },
        { description: 'globex', tenantId: 'globex' },
      ]);
    });

    it('upserts onto it', async () => {
      await orders.upsert(
        { id: acmeOrder.id, description: 'revised' },
        { ctx: ACME },
      );

      expect(storedOrders()).toEqual([
        { description: 'revised', tenantId: 'acme' },
        { description: 'globex', tenantId: 'globex' },
      ]);
    });

    it('upserts a key that names no row as a stamped insert', async () => {
      await orders.upsert(
        { id: 'new-order', description: 'new' },
        { ctx: ACME },
      );

      expect(storedOrders()).toEqual([
        { description: 'acme', tenantId: 'acme' },
        { description: 'globex', tenantId: 'globex' },
        { description: 'new', tenantId: 'acme' },
      ]);
    });

    it('deletes it', async () => {
      await orders.delete(acmeOrder, { ctx: ACME });

      expect(storedOrders()).toEqual([
        { description: 'globex', tenantId: 'globex' },
      ]);
    });

    it('soft-deletes and restores it', async () => {
      await orders.softDelete(acmeOrder, { ctx: ACME });
      expect(await orders.count({ ctx: ACME })).toBe(0);

      await orders.restore(acmeOrder, { ctx: ACME });
      expect(await orders.count({ ctx: ACME })).toBe(1);
    });
  });

  it('refuses a whole deleteMany when one row is out of scope', async () => {
    await expect(
      orders.deleteMany([acmeOrder, globexOrder], { ctx: ACME }),
    ).rejects.toMatchObject({ httpStatus: HttpStatus.NOT_FOUND });

    expect(storedOrders()).toHaveLength(2);
  });

  it("answers 404 to an upsert onto another tenant's soft-deleted row", async () => {
    await orders.softDelete(globexOrder, { ctx: GLOBEX });

    await expect(
      orders.upsert({ id: globexOrder.id, description: 'x' }, { ctx: ACME }),
    ).rejects.toMatchObject({ httpStatus: HttpStatus.NOT_FOUND });
  });

  describe('a resolver checking a foreign key against a peer repository', () => {
    it("allows a line on the caller's own order", async () => {
      const line = await orderLines.create(
        { sku: 'widget', orderId: acmeOrder.id },
        { ctx: ACME },
      );

      expect(line.tenantId).toBe('acme');
    });

    it("refuses a line on another tenant's order", async () => {
      await expect(
        orderLines.create(
          { sku: 'widget', orderId: globexOrder.id },
          { ctx: ACME },
        ),
      ).rejects.toMatchObject({ httpStatus: HttpStatus.FORBIDDEN });

      expect(orderLines.stored).toEqual([]);
    });

    it("refuses moving a line onto another tenant's order", async () => {
      const line = await orderLines.create(
        { sku: 'widget', orderId: acmeOrder.id },
        { ctx: ACME },
      );

      await expect(
        orderLines.update(line, { orderId: globexOrder.id }, { ctx: ACME }),
      ).rejects.toMatchObject({ httpStatus: HttpStatus.FORBIDDEN });

      expect(orderLines.stored.map(({ orderId }) => orderId)).toEqual([
        acmeOrder.id,
      ]);
    });

    // Refused by the repository before the resolver runs, so the resolver
    // only ever has `orderId` to check.
    it('refuses an order supplied as a relation object', async () => {
      await expect(
        orderLines.create(
          { sku: 'widget', order: { id: globexOrder.id } },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RelationWriteException);

      expect(orderLines.stored).toEqual([]);
    });

    it("refuses an admin's line on an order it can read but does not own", async () => {
      expect(
        await orders.findOne({
          where: Where.eq('id', globexOrder.id),
          ctx: ADMIN,
        }),
      ).not.toBeNull();

      await expect(
        orderLines.create(
          { sku: 'widget', orderId: globexOrder.id },
          { ctx: ADMIN },
        ),
      ).rejects.toMatchObject({ httpStatus: HttpStatus.FORBIDDEN });
    });
  });

  // A joined order would be read by the line's resolver alone, so a line
  // naming another tenant's order would return that order.
  describe('a join into another scoped entity', () => {
    const join = [{ relation: 'order' }];

    it.each([
      ['find', () => orderLines.find({ join, ctx: ACME })],
      ['findOne', () => orderLines.findOne({ join, ctx: ACME })],
      ['findAndCount', () => orderLines.findAndCount({ join, ctx: ACME })],
      ['count', () => orderLines.count({ join, ctx: ACME })],
    ])('is refused on %s', async (_name, read) => {
      await expect(read()).rejects.toMatchObject(JOIN_REFUSAL);
    });

    it('leaves a read without the join alone', async () => {
      await orderLines.create(
        { sku: 'widget', orderId: acmeOrder.id },
        { ctx: ACME },
      );

      await expect(orderLines.find({ ctx: ACME })).resolves.toHaveLength(1);
    });
  });
});

describe('a join into another scoped entity added after the caller', () => {
  const ORDER_JOIN = [{ relation: 'order' }];

  @RepoHook()
  class JoinsOrderHook {
    @BeforeRead()
    beforeRead(options: RepositoryFindOptions<OrderLineFixture>) {
      return { ...options, join: ORDER_JOIN };
    }
  }

  @Injectable()
  class JoinsOrderRowScope extends OrderLineRowScopeFixture {
    override scopeQuery<Options extends { where?: WhereClause }>(
      params: RowScopeQueryParams<Options, TenantScopeFixture>,
    ): Options {
      return Object.assign({}, super.scopeQuery(params), { join: ORDER_JOIN });
    }
  }

  @Module({
    imports: [RepositoryModule.forFeature([ORDER_TOKEN, ORDER_LINE_TOKEN])],
    providers: [OrderRowScopeFixture, JoinsOrderRowScope],
    exports: [OrderRowScopeFixture, JoinsOrderRowScope],
  })
  class JoiningResolverModule {}

  async function readLines(
    lines: RepositoryProviderOptions,
    imports: ModuleMetadata['imports'] = [ResolverModule],
  ): Promise<unknown> {
    const moduleRef = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot(),
        RepositoryModule.forRoot({
          imports,
          drivers: [
            {
              driver: MemoryRepositoryModuleFixture,
              entities: [SCOPED[0], lines],
            },
          ],
        }),
      ],
      providers: [JoinsOrderHook],
    }).compile();
    await moduleRef.init();
    const orderLines: MemoryRepositoryFixture<OrderLineFixture> = moduleRef.get(
      getDynamicRepositoryToken(ORDER_LINE_TOKEN),
    );

    try {
      return await orderLines.find({ ctx: ACME });
    } finally {
      await moduleRef.close();
    }
  }

  it('is refused when a hook adds it', async () => {
    await expect(
      readLines({ ...SCOPED[1], hooks: [JoinsOrderHook] }),
    ).rejects.toMatchObject(JOIN_REFUSAL);
  });

  it('is refused when the resolver adds it', async () => {
    await expect(
      readLines(
        {
          ...SCOPED[1],
          rowScope: { access: 'scoped', resolver: JoinsOrderRowScope },
        },
        [JoiningResolverModule],
      ),
    ).rejects.toMatchObject(JOIN_REFUSAL);
  });
});

describe('a join between entities scoped on the same terms', () => {
  const join = [{ relation: 'order' }];
  // The memory driver refuses every join, so reaching it is the pass.
  const REACHED = 'Error while trying to query the order-lines repository';
  const REFUSED = {
    ...JOIN_REFUSAL,
    message: JOIN_REFUSAL.message.replace('OrderLine', 'TenantOrderLine'),
  };

  @Module({
    imports: [RepositoryModule.forFeature([ORDER_TOKEN])],
    providers: [
      OrderRowScopeFixture,
      OrderLineRowScopeFixture,
      JoinableTenantRowScopeFixture,
      OtherJoinableTenantRowScopeFixture,
      OrgRowScopeFixture,
    ],
    exports: [
      OrderRowScopeFixture,
      OrderLineRowScopeFixture,
      JoinableTenantRowScopeFixture,
      OtherJoinableTenantRowScopeFixture,
      OrgRowScopeFixture,
    ],
  })
  class JoinResolverModule {}

  async function findLines(
    orders: Type<RowScopeInterface>,
    lines: Type<RowScopeInterface>,
    entity: Type = TenantOrderLineEntityFixture,
  ): Promise<unknown> {
    const moduleRef = await compile(
      [
        {
          ...SCOPED[0],
          rowScope: { access: 'scoped', resolver: orders },
        },
        {
          key: ORDER_LINE_TOKEN,
          entity,
          rowScope: { access: 'scoped', resolver: lines },
        },
      ],
      {},
      [JoinResolverModule],
    );
    await moduleRef.init();
    const orderLines: MemoryRepositoryFixture<OrderLineFixture> = moduleRef.get(
      getDynamicRepositoryToken(ORDER_LINE_TOKEN),
    );

    try {
      return await orderLines.find({ join, ctx: ACME });
    } finally {
      await moduleRef.close();
    }
  }

  it('reaches the driver when both share a joinable resolver and the join matches its column', async () => {
    await expect(
      findLines(JoinableTenantRowScopeFixture, JoinableTenantRowScopeFixture),
    ).rejects.toThrow(REACHED);
  });

  it('reaches the driver between two joinable classes on the same column and key', async () => {
    await expect(
      findLines(
        OtherJoinableTenantRowScopeFixture,
        JoinableTenantRowScopeFixture,
      ),
    ).rejects.toThrow(REACHED);
  });

  it('is refused, with the fix, when the join leaves out the scope column', async () => {
    await expect(
      findLines(
        JoinableTenantRowScopeFixture,
        JoinableTenantRowScopeFixture,
        OrderLineEntityFixture,
      ),
    ).rejects.toMatchObject({
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      message:
        'Cannot join "order" of OrderLine: the rows it reads are scoped on ' +
        'the same terms, but the join leaves out tenantId, so it could reach ' +
        'rows outside that scope. Make the relation join on (tenantId, orderId).',
    });
  });

  // The line is the root, the order the target. Each pair is (root, target).
  it.each([
    [
      'the root resolver is not joinable',
      OrderRowScopeFixture,
      JoinableTenantRowScopeFixture,
    ],
    [
      'the target resolver is not joinable',
      JoinableTenantRowScopeFixture,
      OrderLineRowScopeFixture,
    ],
    [
      'the target reads its column from another key',
      JoinableTenantRowScopeFixture,
      OrgRowScopeFixture,
    ],
  ])('is refused when %s', async (_case, root, target) => {
    await expect(findLines(target, root)).rejects.toMatchObject(REFUSED);
  });
});

describe('row scope declared through a driver that rewrites its entries', () => {
  @Module({})
  class RewritingDriver {
    static register(entities: RepositoryProviderOptions[]): DynamicModule {
      for (const entity of entities) {
        entity.rowScope = { access: 'public', reason: 'rewritten by driver' };
      }
      return MemoryRepositoryModuleFixture.register(entities);
    }
  }

  @Module({
    imports: [RepositoryModule.forFeature([ORDER_TOKEN])],
    providers: [OrderRowScopeFixture],
    exports: [OrderRowScopeFixture],
  })
  class OrderResolverModule {}

  it('binds the declaration forRoot was given, not the rewritten one', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        RepositoryModule.forRoot({
          imports: [OrderResolverModule],
          drivers: [{ driver: RewritingDriver, entities: [{ ...SCOPED[0] }] }],
        }),
      ],
    }).compile();
    const orders: MemoryRepositoryFixture<OrderFixture> = moduleRef.get(
      getDynamicRepositoryToken(ORDER_TOKEN),
    );

    await orders.create({ description: 'acme' }, { ctx: ACME });
    await orders.create({ description: 'globex' }, { ctx: GLOBEX });

    expect(orders.rowScopeDeclaration).toEqual(SCOPED[0].rowScope);
    expect(
      (await orders.find({ ctx: ACME })).map((order) => order.description),
    ).toEqual(['acme']);

    await moduleRef.close();
  });
});

describe('row scope startup checks', () => {
  it('refuses every call when the driver is registered directly', async () => {
    // Bypassing RepositoryModule.forRoot leaves the repository unbound, and
    // nothing checks a registration it never saw, so the adapter refuses.
    const moduleRef = await Test.createTestingModule({
      imports: [MemoryRepositoryModuleFixture.register([SCOPED[0]])],
    }).compile();
    const direct: MemoryRepositoryFixture<OrderFixture> = moduleRef.get(
      getDynamicRepositoryToken(ORDER_TOKEN),
    );

    await expect(direct.find({ ctx: ACME })).rejects.toThrow(
      RepositoryUnboundException,
    );
    await moduleRef.close();
  });

  it('refuses to start when the resolver is request-scoped', async () => {
    // A request-scoped resolver is never built at startup, so it could never
    // be bound.
    @Injectable({ scope: Scope.REQUEST })
    class RequestScopedRowScope extends OrderRowScopeFixture {}

    @Module({
      imports: [RepositoryModule.forFeature([ORDER_TOKEN])],
      providers: [RequestScopedRowScope],
      exports: [RequestScopedRowScope],
    })
    class RequestScopedResolverModule {}

    await expect(
      compile(
        [
          {
            key: ORDER_TOKEN,
            entity: OrderEntityFixture,
            rowScope: { access: 'scoped', resolver: RequestScopedRowScope },
          },
        ],
        {},
        [RequestScopedResolverModule],
      ),
    ).rejects.toThrow(RowScopeBootException);
  });

  it('refuses to start when the resolver depends on something request-scoped', async () => {
    // Declared singleton, but a request-scoped dependency two levels down
    // makes it one too, so it is never built at startup either.
    @Injectable({ scope: Scope.REQUEST })
    class PerRequestTenant {}

    @Injectable()
    class TenantContext {
      constructor(readonly tenant: PerRequestTenant) {}
    }

    @Injectable()
    class TenantAwareRowScope extends OrderRowScopeFixture {
      constructor(readonly tenant: TenantContext) {
        super();
      }
    }

    @Module({
      imports: [RepositoryModule.forFeature([ORDER_TOKEN])],
      providers: [PerRequestTenant, TenantContext, TenantAwareRowScope],
      exports: [TenantAwareRowScope],
    })
    class TenantAwareResolverModule {}

    const moduleRef = await compile(
      [
        {
          key: ORDER_TOKEN,
          entity: OrderEntityFixture,
          rowScope: { access: 'scoped', resolver: TenantAwareRowScope },
        },
      ],
      {},
      [TenantAwareResolverModule],
    );

    await expect(moduleRef.init()).rejects.toThrow(
      'declares the resolver TenantAwareRowScope, which was never built',
    );
  });

  it('refuses to start when forRootAsync settings depend on something request-scoped', async () => {
    // The settings would drag the binding, and every check behind it, into
    // request scope, so none of them would run at startup.
    @Injectable({ scope: Scope.REQUEST })
    class PerRequestSettings {}

    @Module({ providers: [PerRequestSettings], exports: [PerRequestSettings] })
    class SettingsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        RepositoryModule.forRootAsync({
          imports: [SettingsModule, ResolverModule],
          inject: [PerRequestSettings],
          useFactory: () => ({}),
          drivers: [
            { driver: MemoryRepositoryModuleFixture, entities: [SCOPED[0]] },
          ],
        }),
      ],
    }).compile();

    await expect(moduleRef.init()).rejects.toThrow(RepositoryBootException);
  });

  it('refuses to start when no forRoot import provides the resolver', async () => {
    await expect(compile([SCOPED[0]], {}, [])).rejects.toThrow(
      'OrderRowScopeFixture',
    );
  });

  it('refuses to start on an undeclared entity when declarations are required', async () => {
    await expect(
      compile(
        [{ key: ORDER_TOKEN, entity: OrderEntityFixture }],
        { requireRowScopeDeclaration: true },
        [],
      ),
    ).rejects.toThrow(RowScopeBootException);
  });

  it('refuses to start when an unscoped entity relates to a scoped one', async () => {
    @Module({
      imports: [RepositoryModule.forFeature([ORDER_TOKEN])],
      providers: [OrderRowScopeFixture],
      exports: [OrderRowScopeFixture],
    })
    class OrderResolverModule {}

    await expect(
      compile(
        [
          SCOPED[0],
          {
            key: ORDER_LINE_TOKEN,
            entity: OrderLineEntityFixture,
            rowScope: { access: 'public', reason: 'shared' },
          },
        ],
        {},
        [OrderResolverModule],
      ),
    ).rejects.toThrow(
      '"order-lines" has no row scope, but its "order" relation points at Order',
    );
  });

  it('refuses to start when an entity allowing eager relations relates to a scoped one', async () => {
    await expect(
      compile([SCOPED[0], { ...SCOPED[1], allowEagerRelations: true }]),
    ).rejects.toThrow(
      '"order-lines" allows eager relations, but "order" (Order rows) reach ' +
        'rows with a row scope, which an eager relation would bypass on ' +
        'every read. Remove allowEagerRelations from "order-lines" in ' +
        'forRoot().',
    );
  });

  it('starts on an undeclared entity by default', async () => {
    const moduleRef = await compile(
      [{ key: ORDER_TOKEN, entity: OrderEntityFixture }],
      {},
      [],
    );

    await expect(moduleRef.init()).resolves.toBeDefined();
    await moduleRef.close();
  });
});
