import { type Logger } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryModule,
  type RepositoryInterface,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { RlsOrderEntityFixture } from '../../__fixtures__/rls/rls-order.entity.fixture.js';
import { TypeOrmPostgresRepositoryModule } from '../typeorm-postgres-repository.module.js';

const TENANT = '00000000-0000-4000-8000-00000000000a';

/** The statements the data source sends, as sent. */
const queries: string[] = [];
const logger: Logger = {
  logQuery: (query) => void queries.push(query),
  logQueryError: () => undefined,
  logQuerySlow: () => undefined,
  logSchemaBuild: () => undefined,
  logMigration: () => undefined,
  log: () => undefined,
};

/** The row lock each locking read takes, in order. */
const locks = (): string[] =>
  queries.flatMap((query) => query.match(/\bFOR (?:NO KEY )?UPDATE\b/gi) ?? []);

/**
 * A delete in a run locks the rows it removes as a delete needs:
 * `FOR UPDATE`, not the `FOR NO KEY UPDATE` an update takes, which lets
 * another transaction insert a row referencing one about to be deleted.
 */
describe('TypeOrmPostgresRepository delete lock', () => {
  let moduleFixture: TestingModule;
  let orders: RepositoryInterface<RlsOrderEntityFixture>;
  let txScope: TransactionScope;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url:
            process.env.POSTGRES_URL ??
            'postgres://postgres:postgres@localhost:55432/rockets_test',
          entities: [RlsOrderEntityFixture],
          dropSchema: true,
          synchronize: true,
          logging: ['query'],
          logger,
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmPostgresRepositoryModule,
              entities: [{ key: 'orders', entity: RlsOrderEntityFixture }],
            },
          ],
        }),
      ],
    }).compile();
    await moduleFixture.init();
    orders = moduleFixture.get(getDynamicRepositoryToken('orders'));
    txScope = moduleFixture.get(TransactionScope);
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('locks the row a guarded delete removes for update', async () => {
    const order = await orders.create({ tenantId: TENANT, name: 'one' });
    queries.length = 0;

    await txScope.run({}, (txCtx) =>
      orders.delete(order, { ctx: txCtx, expectedVersion: order.version }),
    );

    expect(locks()).toEqual(['FOR UPDATE']);
  });

  it('locks the rows a deleteMany removes for update', async () => {
    const created = await orders.createMany([
      { tenantId: TENANT, name: 'one' },
      { tenantId: TENANT, name: 'two' },
    ]);
    queries.length = 0;

    await txScope.run({}, (txCtx) =>
      orders.deleteMany(created, { ctx: txCtx }),
    );

    expect(locks()).toEqual(['FOR UPDATE']);
  });
});
