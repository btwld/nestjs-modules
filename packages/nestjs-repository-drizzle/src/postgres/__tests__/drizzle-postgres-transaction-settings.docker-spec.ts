import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

import { type INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';

import { AppContextHost, CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryModule,
  type RepositoryInterface,
  RowScopeCtx,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { DrizzlePostgresRepositoryModule } from '../drizzle-postgres-repository.module.js';

/**
 * `transactionSettings` against a real Postgres with a tenant policy. The
 * application connects as a role that doesn't own the table and can't
 * bypass row-level security, through a pool of one connection, so every
 * test reuses the connection the previous one left behind.
 */
const ADMIN_URL =
  process.env.POSTGRES_URL ??
  'postgres://postgres:postgres@localhost:55432/rockets_test';
const APP_ROLE = 'rls_app';
const TENANT_A = '00000000-0000-4000-8000-00000000000a';
const TENANT_B = '00000000-0000-4000-8000-00000000000b';
// The settings below turn this tenant into a setting name Postgres refuses.
const TENANT_REFUSED = '00000000-0000-4000-8000-0000000000ff';

const orderTable = pgTable('drizzle_rls_order', {
  id: uuid().primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text().notNull(),
});

class OrderEntity {
  declare id: string;
  declare tenantId: string;
  declare name: string;
}

function appUrl(): string {
  const url = new URL(ADMIN_URL);
  url.username = APP_ROLE;
  url.password = APP_ROLE;
  return url.toString();
}

function tenantCtx(tenantId?: string): AppContextHost {
  const ctx = new AppContextHost();
  if (tenantId) {
    ctx.defineOverlay(RowScopeCtx, { tenantId });
  }
  return ctx;
}

@Module({})
class RlsRootModule {}

describe('transactionSettings on Postgres (Drizzle)', () => {
  const admin = new Pool({ connectionString: ADMIN_URL, max: 1 });
  let app: INestApplicationContext;
  let txScope: TransactionScope;
  let orders: RepositoryInterface<OrderEntity>;

  const namesFor = (tenantId?: string): Promise<string[]> =>
    txScope.run(tenantCtx(tenantId), async (txCtx) =>
      (await orders.find({ ctx: txCtx })).map(({ name }) => name).sort(),
    );

  beforeAll(async () => {
    const tenant = `nullif(current_setting('app.tenant_id', true), '')::uuid`;
    await admin.query(`
      do $$ begin
        if not exists (select from pg_roles where rolname = '${APP_ROLE}') then
          create role ${APP_ROLE} login password '${APP_ROLE}'
            nosuperuser nobypassrls;
        end if;
      end $$;
      drop table if exists drizzle_rls_order;
      create table drizzle_rls_order (
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid not null,
        name text not null
      );
      alter table drizzle_rls_order enable row level security;
      alter table drizzle_rls_order force row level security;
      create policy tenant_isolation on drizzle_rls_order
        for all
        using (tenant_id = ${tenant})
        with check (tenant_id = ${tenant});
      grant select, insert, update, delete on drizzle_rls_order to ${APP_ROLE};
      insert into drizzle_rls_order (tenant_id, name) values
        ('${TENANT_A}', 'a-1'), ('${TENANT_A}', 'a-2'), ('${TENANT_B}', 'b-1');
    `);

    app = await NestFactory.createApplicationContext(
      {
        module: RlsRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: () => ({
              db: drizzle({
                connection: { connectionString: appUrl(), max: 1 },
              }),
            }),
          }),
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: DrizzlePostgresRepositoryModule,
                entities: [
                  { key: 'rls-orders', entity: OrderEntity, table: orderTable },
                ],
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
      },
      { abortOnError: false },
    );
    txScope = app.get(TransactionScope);
    orders = app.get(getDynamicRepositoryToken('rls-orders'));
  });

  afterAll(async () => {
    await app?.close();
    await admin.query('drop table if exists drizzle_rls_order');
    await admin.end();
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

    const { rows } = await admin.query<{ open: number }>(
      `select count(*)::int as open from pg_stat_activity
        where usename = $1 and state like 'idle in transaction%'`,
      [APP_ROLE],
    );
    expect(rows).toEqual([{ open: 0 }]);
    expect(await namesFor(TENANT_A)).toEqual(['a-1', 'a-2']);
  });
});
