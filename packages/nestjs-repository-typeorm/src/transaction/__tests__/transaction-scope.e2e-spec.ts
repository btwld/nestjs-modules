import { type DataSource, type EntityManager } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { AppContextHost } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  type TransactionContextInterface,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { TEST_ENTITY_TOKEN } from '../../__fixtures__/repository/config/test.constants.fixture.js';
import { TestEntityFixture } from '../../__fixtures__/repository/entity/test.entity.fixture.js';
import { AppModuleFixture } from '../../__fixtures__/repository/module/app.module.fixture.js';
import { type TypeOrmRepository } from '../../repository/typeorm-repository.js';
import { resolveTransactionKey } from '../../typeorm-repository.util.js';

/**
 * Regression coverage for #468 against a real TypeORM stack — a second
 * `run()` on the same context must not reuse the first run's (committed
 * or rolled back) transaction, and a plain, non-transactional read after a
 * completed run must not touch it either.
 */
describe('TransactionScope — sequential run() on the same context (#468)', () => {
  let moduleFixture: TestingModule;
  let txScope: TransactionScope;
  let testRepository: TypeOrmRepository<TestEntityFixture>;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    txScope = moduleFixture.get(TransactionScope);
    testRepository = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
      getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
    );
  });

  it('should persist both rows when run() is called twice on the same context', async () => {
    const ctx = new AppContextHost();

    await txScope.run(ctx, async (txCtx: TransactionContextInterface) => {
      return testRepository.create({ firstName: 'Alice' }, { ctx: txCtx });
    });

    await txScope.run(ctx, async (txCtx: TransactionContextInterface) => {
      return testRepository.create({ firstName: 'Bob' }, { ctx: txCtx });
    });

    const result = await testRepository.find();
    expect(result.map((e) => e.firstName).sort()).toEqual(['Alice', 'Bob']);
  });

  it('should serve a plain read on the same context after a completed run without touching the dead transaction', async () => {
    const ctx = new AppContextHost();

    await txScope.run(ctx, async (txCtx: TransactionContextInterface) => {
      return testRepository.create({ firstName: 'Alice' }, { ctx: txCtx });
    });

    const result = await testRepository.find({ ctx });
    expect(result.map((e) => e.firstName)).toEqual(['Alice']);
  });

  it('should roll back a failed run and still commit a later successful run on the same context', async () => {
    const ctx = new AppContextHost();

    await expect(
      txScope.run(ctx, async (txCtx: TransactionContextInterface) => {
        await testRepository.create({ firstName: 'Doomed' }, { ctx: txCtx });
        throw new Error('rollback me');
      }),
    ).rejects.toThrow('rollback me');

    await txScope.run(ctx, async (txCtx: TransactionContextInterface) => {
      return testRepository.create({ firstName: 'Alice' }, { ctx: txCtx });
    });

    const result = await testRepository.find();
    expect(result.map((e) => e.firstName)).toEqual(['Alice']);
  });
});

/**
 * Regression coverage for out-of-scope defect #1 — commitAll() rolled back
 * "clean" (never explicitly marked dirty) transactions, so a write made
 * directly through `tx.getClient()` (the documented escape hatch) was
 * silently discarded while `run()` still resolved successfully.
 */
describe('TransactionScope — commits every active transaction (defect #1)', () => {
  let moduleFixture: TestingModule;
  let txScope: TransactionScope;
  let testRepository: TypeOrmRepository<TestEntityFixture>;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    txScope = moduleFixture.get(TransactionScope);
    testRepository = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
      getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
    );
  });

  it('should persist a write made directly through tx.getClient(), with no markDirty() call', async () => {
    const ctx = new AppContextHost();

    await txScope.run(ctx, async (txCtx: TransactionContextInterface) => {
      const tx = await txCtx.trx.getOrStart(resolveTransactionKey());
      const manager = tx.getClient<EntityManager>();
      await manager.save(TestEntityFixture, { firstName: 'Ghost' });
    });

    const result = await testRepository.find();
    expect(result.map((e) => e.firstName)).toEqual(['Ghost']);
  });

  it('should leave the database untouched for a readOnly run through the repository', async () => {
    const ctx = new AppContextHost();

    await txScope.runReadOnly(
      ctx,
      async (txCtx: TransactionContextInterface) => {
        return testRepository.create({ firstName: 'Alice' }, { ctx: txCtx });
      },
    );

    const result = await testRepository.find();
    expect(result).toEqual([]);
  });
});

/**
 * Regression coverage against a real driver for a race in
 * `TransactionManager.getOrStart()` — two concurrent repository calls as the
 * first DB work in a `run()` used to each open their own `QueryRunner`
 * before either finished starting, so only the last one written was ever
 * committed or released, leaking the other.
 */
describe('TransactionScope — concurrent repository calls share one connection', () => {
  let moduleFixture: TestingModule;
  let txScope: TransactionScope;
  let testRepository: TypeOrmRepository<TestEntityFixture>;
  let dataSource: DataSource;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    txScope = moduleFixture.get(TransactionScope);
    testRepository = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
      getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
    );
    dataSource = moduleFixture.get(getDataSourceToken());
  });

  it('should open only one QueryRunner for concurrent reads racing to start the same transaction', async () => {
    const createQueryRunnerSpy = vi.spyOn(dataSource, 'createQueryRunner');

    const ctx = new AppContextHost();

    await txScope.run(ctx, async (txCtx: TransactionContextInterface) => {
      await Promise.all([
        testRepository.find({ ctx: txCtx }),
        testRepository.find({ ctx: txCtx }),
        testRepository.find({ ctx: txCtx }),
      ]);
    });

    expect(createQueryRunnerSpy).toHaveBeenCalledTimes(1);
  });
});
