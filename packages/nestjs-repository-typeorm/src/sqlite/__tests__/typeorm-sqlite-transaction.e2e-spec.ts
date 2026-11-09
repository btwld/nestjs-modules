import { type DataSource } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  RepositoryDatabaseException,
  type RepositoryInterface,
  TransactionDoomedException,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { TEST_ENTITY_TOKEN } from '../../__fixtures__/repository/config/test.constants.fixture.js';
import { type TestEntityFixture } from '../../__fixtures__/repository/entity/test.entity.fixture.js';
import { AppModuleFixture } from '../../__fixtures__/repository/module/app.module.fixture.js';
import { TypeOrmSqliteTransaction } from '../typeorm-sqlite-transaction.js';

describe('TypeOrmSqliteRepository on one connection', () => {
  let moduleFixture: TestingModule;
  let dataSource: DataSource;
  let tests: RepositoryInterface<TestEntityFixture>;
  let scope: TransactionScope;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    dataSource = moduleFixture.get(getDataSourceToken());
    tests = moduleFixture.get(getDynamicRepositoryToken(TEST_ENTITY_TOKEN));
    scope = moduleFixture.get(TransactionScope);
  });

  afterEach(async () => {
    await moduleFixture.close();
  });

  it('begins a second transaction only once the first has ended', async () => {
    const first = new TypeOrmSqliteTransaction(dataSource);
    const second = new TypeOrmSqliteTransaction(dataSource);
    await first.start();

    let started = false;
    const starting = second.start().then(() => (started = true));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(started).toBe(false);

    await first.rollback();
    await starting;
    expect(second.isActive).toBe(true);
    await second.rollback();
  });

  it('rolls back a run whose commit SQLite refuses, keeping none of its writes', async () => {
    await dataSource.query('pragma foreign_keys = on');
    await dataSource.query('create table parent (id integer primary key)');
    await dataSource.query(`create table child (
      id integer primary key,
      parent_id integer references parent (id) deferrable initially deferred
    )`);

    await expect(
      scope.run({}, async (txCtx) => {
        await tests.create({ firstName: 'in-run' }, { ctx: txCtx });
        // A query of your own on the data source runs in the open
        // transaction; its deferred key fails only at COMMIT.
        await dataSource.query('insert into child (parent_id) values (1)');
      }),
    ).rejects.toThrow('FOREIGN KEY constraint failed');

    // The data source's one query runner, which every transaction shares.
    expect(dataSource.createQueryRunner().isTransactionActive).toBe(false);
    expect(await tests.find()).toEqual([]);
  });

  it('fails a run whose statement fills the database, keeping none of its writes', async () => {
    // SQLite may roll the transaction back when the database is full; the
    // run fails either way.
    const [pages] =
      await dataSource.query<{ page_count: number }[]>('pragma page_count');
    await dataSource.query(`pragma max_page_count = ${pages?.page_count ?? 0}`);

    let full: unknown;
    const run = scope.run({}, async (txCtx) => {
      await tests.create({ firstName: 'before' }, { ctx: txCtx });
      full = await tests
        .create({ firstName: 'x'.repeat(100_000) }, { ctx: txCtx })
        .catch((error: unknown) => error);
      await tests.create({ firstName: 'after' }, { ctx: txCtx });
    });

    await expect(run).rejects.toThrow(TransactionDoomedException);
    expect(full).toBeInstanceOf(RepositoryDatabaseException);
    expect(full).toHaveProperty('context.code', 'SQLITE_FULL');
    expect(await tests.find()).toEqual([]);
  });
});
