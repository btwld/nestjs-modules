import { type DataSource } from 'typeorm';

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
  applyVpdTenantPolicy,
  createVpdOwner,
  VPD_APP_USER,
  VPD_CONNECT_STRING,
  VPD_CONTEXT_PROCEDURE,
  VPD_REFUSED,
  VPD_UNCLEARABLE,
} from '../../__fixtures__/vpd/vpd-database.fixture.js';
import { VpdOrderEntityFixture } from '../../__fixtures__/vpd/vpd-order.entity.fixture.js';
import { type TypeOrmRepository } from '../../repository/typeorm-repository.js';
import { TypeOrmOracleRepositoryModule } from '../typeorm-oracle-repository.module.js';

/**
 * `applicationContext` against a real Oracle with the README's Virtual
 * Private Database recipe. The application connects as a user that doesn't
 * own the table and isn't exempt from policies, through a pool of one
 * connection, so every test reuses the connection the previous one left
 * behind.
 */
const ORDERS_KEY = 'vpd-orders';
const TENANT_A = '00000000-0000-4000-8000-00000000000a';
const TENANT_B = '00000000-0000-4000-8000-00000000000b';
// The values below turn this tenant into tenant A plus a name the context
// refuses.
const TENANT_REFUSED = '00000000-0000-4000-8000-0000000000ff';
// ...and this one into tenant A plus a value the context won't clear.
const TENANT_UNCLEARABLE = '00000000-0000-4000-8000-0000000000ee';

function tenantCtx(tenantId?: string): AppContextHost {
  const ctx = new AppContextHost();
  if (tenantId) {
    ctx.defineOverlay(RowScopeCtx, { tenantId });
  }
  return ctx;
}

describe('applicationContext on Oracle', () => {
  let owner: DataSource;
  let moduleFixture: TestingModule;
  let txScope: TransactionScope;
  let orders: TypeOrmRepository<VpdOrderEntityFixture>;
  let app: DataSource;

  const namesFor = (tenantId?: string): Promise<string[]> =>
    txScope.run(tenantCtx(tenantId), async (txCtx) =>
      (await orders.find({ ctx: txCtx })).map(({ name }) => name).sort(),
    );

  /** The session the pool's one connection belongs to; never reused. */
  const sessionId = async (): Promise<string> => {
    const [{ id }] = await app.query<{ id: string }[]>(
      `SELECT SYS_CONTEXT('USERENV', 'SESSIONID') AS "id" FROM DUAL`,
    );
    return id;
  };

  beforeAll(async () => {
    owner = await createVpdOwner([VpdOrderEntityFixture]);
    await owner.getRepository(VpdOrderEntityFixture).save([
      { tenantId: TENANT_A, name: 'a-1' },
      { tenantId: TENANT_A, name: 'a-2' },
      { tenantId: TENANT_B, name: 'b-1' },
    ]);
    await applyVpdTenantPolicy(owner, 'vpd_order', 'tenant_id');

    moduleFixture = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'oracle',
          connectString: VPD_CONNECT_STRING,
          username: VPD_APP_USER,
          password: VPD_APP_USER,
          entities: [VpdOrderEntityFixture],
          poolSize: 1,
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmOracleRepositoryModule,
              entities: [{ key: ORDERS_KEY, entity: VpdOrderEntityFixture }],
              options: {
                applicationContext: {
                  procedure: VPD_CONTEXT_PROCEDURE,
                  values: (ctx) => {
                    if (!ctx.supports(RowScopeCtx)) {
                      return {};
                    }
                    const { tenantId } = ctx.with(RowScopeCtx);
                    if (tenantId === TENANT_REFUSED) {
                      return { tenant_id: TENANT_A, [VPD_REFUSED]: 'x' };
                    }
                    if (tenantId === TENANT_UNCLEARABLE) {
                      return { [VPD_UNCLEARABLE]: 'yes', tenant_id: TENANT_A };
                    }
                    return { tenant_id: tenantId };
                  },
                },
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
    await owner?.destroy();
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
        context: expect.objectContaining({ code: 'ORA-28115' }),
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

  it('fails a transaction whose value is refused, leaving the connection clean', async () => {
    const before = await sessionId();

    await expect(namesFor(TENANT_REFUSED)).rejects.toThrow('ORA-');

    expect(await sessionId()).toBe(before);
    expect(await orders.find({ ctx: tenantCtx(TENANT_A) })).toEqual([]);
    expect(await namesFor(TENANT_A)).toEqual(['a-1', 'a-2']);
  });

  // Last: the connection keeps refusing to clear for the rest of the run.
  it("commits and releases a connection whose values can't be cleared, until the next transaction replaces them", async () => {
    const before = await sessionId();

    expect(await namesFor(TENANT_UNCLEARABLE)).toEqual(['a-1', 'a-2']);

    expect(await sessionId()).toBe(before);
    const names = await namesFor(TENANT_B);
    expect(names).toContain('b-1');
    expect(names).not.toContain('a-1');
  });
});
