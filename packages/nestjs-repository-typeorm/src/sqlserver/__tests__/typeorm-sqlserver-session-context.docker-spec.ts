import { type DataSource, EntityManager } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';

import { AppContextHost, CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryModule,
  RowScopeCtx,
  TransactionScope,
} from '@concepta/nestjs-repository';

import {
  applySessionContextTenantPolicy,
  createSessionContextOwner,
  dropSessionContextTenantPolicy,
  SESSION_CONTEXT_DATABASE,
} from '../../__fixtures__/session-context/session-context-database.fixture.js';
import { SessionContextOrderEntityFixture } from '../../__fixtures__/session-context/session-context-order.entity.fixture.js';
import { type TypeOrmRepository } from '../../repository/typeorm-repository.js';
import { TypeOrmSqlServerRepositoryModule } from '../typeorm-sqlserver-repository.module.js';

/**
 * `sessionContext` against a real SQL Server with the README's row-level
 * security recipe, through a pool of one connection, so every test reuses
 * the connection the previous one left behind, values included.
 */
const ORDERS_KEY = 'session-context-orders';
const TRANSACTION_KEY = 'typeorm-sqlserver:default';
const TENANT_A = '00000000-0000-4000-8000-00000000000a';
const TENANT_B = '00000000-0000-4000-8000-00000000000b';

function tenantCtx(tenantId?: string): AppContextHost {
  const ctx = new AppContextHost();
  if (tenantId) {
    ctx.defineOverlay(RowScopeCtx, { tenantId });
  }
  return ctx;
}

describe('sessionContext on SQL Server', () => {
  let owner: DataSource;
  let moduleFixture: TestingModule;
  let txScope: TransactionScope;
  let orders: TypeOrmRepository<SessionContextOrderEntityFixture>;
  let app: DataSource;

  const namesFor = (tenantId?: string): Promise<string[]> =>
    txScope.run(tenantCtx(tenantId), async (txCtx) =>
      (await orders.find({ ctx: txCtx })).map(({ name }) => name).sort(),
    );

  /** The tenant the pool's one connection holds, outside any transaction. */
  const leftTenant = async (): Promise<string | null> => {
    const [{ tenant }] = await app.query<{ tenant: string | null }[]>(
      `SELECT CAST(SESSION_CONTEXT(N'tenant_id') AS nvarchar(36)) AS tenant`,
    );
    return tenant;
  };

  beforeAll(async () => {
    owner = await createSessionContextOwner([SessionContextOrderEntityFixture]);
    await owner.getRepository(SessionContextOrderEntityFixture).save([
      { tenantId: TENANT_A, name: 'a-1' },
      { tenantId: TENANT_A, name: 'a-2' },
      { tenantId: TENANT_B, name: 'b-1' },
    ]);
    await applySessionContextTenantPolicy(
      owner,
      'session_context_order',
      'tenant_id',
    );

    moduleFixture = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot(),
        TypeOrmModule.forRoot({
          ...SESSION_CONTEXT_DATABASE,
          entities: [SessionContextOrderEntityFixture],
          pool: { min: 1, max: 1 },
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmSqlServerRepositoryModule,
              entities: [
                { key: ORDERS_KEY, entity: SessionContextOrderEntityFixture },
              ],
              options: {
                // Nothing without a tenant: the driver still clears the
                // tenant an earlier transaction left on the connection.
                sessionContext: (ctx) =>
                  ctx.supports(RowScopeCtx)
                    ? { tenant_id: ctx.with(RowScopeCtx).tenantId }
                    : {},
              },
            },
          ],
        }),
      ],
    }).compile();

    txScope = moduleFixture.get(TransactionScope);
    orders = moduleFixture.get(getDynamicRepositoryToken(ORDERS_KEY));
    app = moduleFixture.get(getDataSourceToken());
  });

  afterAll(async () => {
    await moduleFixture?.close();
    if (owner) {
      await dropSessionContextTenantPolicy(owner);
      await owner.destroy();
    }
  });

  it("reads only the caller's tenant", async () => {
    expect(await namesFor(TENANT_A)).toEqual(['a-1', 'a-2']);
    expect(await namesFor(TENANT_B)).toEqual(['b-1']);
  });

  it('gives the next transaction on the connection no tenant', async () => {
    await namesFor(TENANT_A);

    expect(await namesFor()).toEqual([]);
  });

  it('reads nothing outside a transaction, on a connection still holding a tenant', async () => {
    await namesFor(TENANT_A);

    expect(await leftTenant()).toBe(TENANT_A);
    expect(await orders.find({ ctx: tenantCtx(TENANT_A) })).toEqual([]);
  });

  it('changes nothing outside a transaction, on a connection still holding a tenant', async () => {
    await namesFor(TENANT_A);

    expect(await leftTenant()).toBe(TENANT_A);
    const [{ changed }] = await app.query<{ changed: number }[]>(
      `UPDATE session_context_order SET name = name; SELECT @@ROWCOUNT AS changed`,
    );
    expect(changed).toBe(0);
  });

  it('reads nothing after the server aborts a transaction that set a tenant', async () => {
    await expect(
      txScope.run(tenantCtx(TENANT_A), async (txCtx) => {
        await orders.find({ ctx: txCtx });
        const client = (
          await txCtx.trx.getOrStart(TRANSACTION_KEY)
        ).getClient();
        if (!(client instanceof EntityManager)) {
          throw new Error('Expected a TypeORM entity manager');
        }
        await client.query('SET XACT_ABORT ON; SELECT 1/0');
      }),
    ).rejects.toThrow();

    expect(await leftTenant()).toBe(TENANT_A);
    expect(await orders.find({ ctx: tenantCtx(TENANT_A) })).toEqual([]);
  });

  it("refuses an insert into another tenant's rows", async () => {
    await expect(
      txScope.run(tenantCtx(TENANT_A), (txCtx) =>
        orders.create({ tenantId: TENANT_B, name: 'b-2' }, { ctx: txCtx }),
      ),
    ).rejects.toThrow('block predicate');

    expect(await namesFor(TENANT_B)).toEqual(['b-1']);
  });

  it("inserts into the caller's tenant", async () => {
    await txScope.run(tenantCtx(TENANT_B), (txCtx) =>
      orders.create({ tenantId: TENANT_B, name: 'b-3' }, { ctx: txCtx }),
    );

    expect(await namesFor(TENANT_B)).toEqual(['b-1', 'b-3']);
    expect(await namesFor(TENANT_A)).toEqual(['a-1', 'a-2']);
  });
});
