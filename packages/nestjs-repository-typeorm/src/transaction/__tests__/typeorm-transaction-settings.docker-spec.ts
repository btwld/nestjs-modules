import { type DataSource } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppContextHost, CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryModule,
  RowScopeCtx,
  TransactionScope,
} from '@concepta/nestjs-repository';

import {
  applyTenantPolicy,
  createRlsAdmin,
  RLS_APP_ROLE,
  rlsAppUrl,
} from '../../__fixtures__/rls/rls-database.fixture.js';
import { RlsOrderEntityFixture } from '../../__fixtures__/rls/rls-order.entity.fixture.js';
import { type TypeOrmRepository } from '../../repository/typeorm-repository.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';

/**
 * `transactionSettings` against a real Postgres with the README's policy
 * recipe. The application connects as a role that doesn't own the table and
 * can't bypass row-level security, through a pool of one connection, so
 * every test reuses the connection the previous one left behind.
 */
const ORDERS_KEY = 'rls-orders';
const TENANT_A = '00000000-0000-4000-8000-00000000000a';
const TENANT_B = '00000000-0000-4000-8000-00000000000b';
// The settings below turn this tenant into a setting name Postgres refuses.
const TENANT_REFUSED = '00000000-0000-4000-8000-0000000000ff';

function tenantCtx(tenantId?: string): AppContextHost {
  const ctx = new AppContextHost();
  if (tenantId) {
    ctx.defineOverlay(RowScopeCtx, { tenantId });
  }
  return ctx;
}

describe('transactionSettings on Postgres', () => {
  let admin: DataSource;
  let moduleFixture: TestingModule;
  let txScope: TransactionScope;
  let orders: TypeOrmRepository<RlsOrderEntityFixture>;

  const namesFor = (tenantId?: string): Promise<string[]> =>
    txScope.run(tenantCtx(tenantId), async (txCtx) =>
      (await orders.find({ ctx: txCtx })).map(({ name }) => name).sort(),
    );

  beforeAll(async () => {
    admin = await createRlsAdmin([RlsOrderEntityFixture]);
    await applyTenantPolicy(admin, 'rls_order', 'tenant_id');
    await admin.getRepository(RlsOrderEntityFixture).save([
      { tenantId: TENANT_A, name: 'a-1' },
      { tenantId: TENANT_A, name: 'a-2' },
      { tenantId: TENANT_B, name: 'b-1' },
    ]);

    moduleFixture = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: rlsAppUrl(),
          entities: [RlsOrderEntityFixture],
          extra: { max: 1 },
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmRepositoryModule,
              entities: [{ key: ORDERS_KEY, entity: RlsOrderEntityFixture }],
              options: {
                transactionSettings: (ctx) => {
                  if (!ctx.supports(RowScopeCtx)) {
                    return {};
                  }
                  const { tenantId } = ctx.with(RowScopeCtx);
                  return tenantId === TENANT_REFUSED
                    ? { 'no-dot-is-refused': tenantId }
                    : { 'app.tenant_id': tenantId };
                },
              },
            },
          ],
        }),
      ],
    }).compile();

    txScope = moduleFixture.get(TransactionScope);
    orders = moduleFixture.get(getDynamicRepositoryToken(ORDERS_KEY));
  });

  afterAll(async () => {
    await moduleFixture?.close();
    await admin?.destroy();
  });

  it("reads only the caller's tenant", async () => {
    expect(await namesFor(TENANT_A)).toEqual(['a-1', 'a-2']);
    expect(await namesFor(TENANT_B)).toEqual(['b-1']);
  });

  it('gives the next transaction on the connection no tenant', async () => {
    await namesFor(TENANT_A);

    expect(await namesFor()).toEqual([]);
  });

  it('reads nothing outside a transaction, on a connection a tenant used', async () => {
    await namesFor(TENANT_A);

    expect(await orders.find({ ctx: tenantCtx(TENANT_A) })).toEqual([]);
  });

  it("refuses an insert into another tenant's rows", async () => {
    await expect(
      txScope.run(tenantCtx(TENANT_A), (txCtx) =>
        orders.create({ tenantId: TENANT_B, name: 'b-2' }, { ctx: txCtx }),
      ),
    ).rejects.toThrow(
      expect.objectContaining({
        context: expect.objectContaining({ code: '42501' }),
      }),
    );

    expect(await namesFor(TENANT_B)).toEqual(['b-1']);
  });

  it('inserts into the caller’s tenant', async () => {
    await txScope.run(tenantCtx(TENANT_B), (txCtx) =>
      orders.create({ tenantId: TENANT_B, name: 'b-3' }, { ctx: txCtx }),
    );

    expect(await namesFor(TENANT_B)).toEqual(['b-1', 'b-3']);
    expect(await namesFor(TENANT_A)).toEqual(['a-1', 'a-2']);
  });

  it('rolls back a transaction whose setting fails, leaving the connection clean', async () => {
    await expect(namesFor(TENANT_REFUSED)).rejects.toThrow(
      'unrecognized configuration parameter',
    );

    const [{ open }] = await admin.query<{ open: number }[]>(
      `select count(*)::int as open from pg_stat_activity
        where usename = $1 and state like 'idle in transaction%'`,
      [RLS_APP_ROLE],
    );
    expect(open).toBe(0);
    expect(await namesFor(TENANT_A)).toEqual(['a-1', 'a-2']);
  });
});
