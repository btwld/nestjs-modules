import { EntityManager } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  OptimisticLockException,
  TransactionScope,
} from '@concepta/nestjs-repository';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { TEST_ENTITY_TOKEN } from '../../__fixtures__/repository/config/test.constants.fixture.js';
import { TestEntityFixture } from '../../__fixtures__/repository/entity/test.entity.fixture.js';
import { TestFactoryFixture } from '../../__fixtures__/repository/factory/test.factory.fixture.js';
import { AppModuleFixture } from '../../__fixtures__/repository/module/app.module.fixture.js';
import { TypeOrmSqliteRepository } from '../../sqlite/typeorm-sqlite-repository.js';
import { TypeOrmRepository } from '../typeorm-repository.js';

/**
 * What the TypeORM driver does beyond the driver contract, which
 * `typeorm-conformance.e2e-spec.ts` covers.
 */
describe(TypeOrmRepository, () => {
  let moduleFixture: TestingModule;
  let testRepository: TypeOrmRepository<TestEntityFixture>;
  let seedingSource: SeedingSource;
  let testFactory: TestFactoryFixture;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    // Get the TypeOrmRepository via public token
    testRepository = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
      getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
    );

    seedingSource = new SeedingSource({
      dataSource: moduleFixture.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    testFactory = new TestFactoryFixture({
      entity: TestEntityFixture,
      seedingSource,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('version column', () => {
    it('returns the deleted row with its key under expectedVersion', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });

      expect(
        await testRepository.delete(created, {
          expectedVersion: created.version,
        }),
      ).toEqual(created);
    });
  });

  // Regression coverage for #476: two concurrent CRUD-style writes, each
  // with no shared ctx (the shape a real request handler produces), used
  // to fail with a driver-level "cannot start a transaction within a
  // transaction" error on SQLite instead of resolving/conflicting on the
  // version guard.
  describe('concurrent writes (#476)', () => {
    it('should let two concurrent updates to different rows both succeed', async () => {
      const alice = await testFactory.create({ firstName: 'Alice' });
      const bob = await testFactory.create({ firstName: 'Bob' });

      const [updatedAlice, updatedBob] = await Promise.all([
        testRepository.update(alice, { lastName: 'Updated' }),
        testRepository.update(bob, { lastName: 'Updated' }),
      ]);

      expect(updatedAlice.lastName).toBe('Updated');
      expect(updatedBob.lastName).toBe('Updated');
    });

    it('should let one of two concurrent updates to the same row succeed and reject the other with OptimisticLockException', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      const results = await Promise.allSettled([
        testRepository.update(entity, { firstName: 'First' }),
        testRepository.update(entity, { firstName: 'Second' }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(OptimisticLockException);
    });
  });

  describe('outside a run', () => {
    let transactionScope: TransactionScope;

    beforeEach(() => {
      transactionScope = moduleFixture.get(TransactionScope);
    });

    it.each([
      [
        'update',
        (repo: TypeOrmRepository<TestEntityFixture>, e: TestEntityFixture) =>
          repo.update(e, { firstName: 'Bob' }),
      ],
      [
        'replace',
        (repo: TypeOrmRepository<TestEntityFixture>, e: TestEntityFixture) =>
          repo.replace(e, { firstName: 'Bob' }),
      ],
      [
        'softDelete with expectedVersion',
        (repo: TypeOrmRepository<TestEntityFixture>, e: TestEntityFixture) =>
          repo.softDelete(e, { expectedVersion: e.version }),
      ],
      [
        'delete with expectedVersion',
        (repo: TypeOrmRepository<TestEntityFixture>, e: TestEntityFixture) =>
          repo.delete(e, { expectedVersion: e.version }),
      ],
    ] as const)('%s opens no transaction of its own', async (_name, call) => {
      const entity = await testFactory.create({ firstName: 'Alice' });
      // How a driver would open one: `DataSource.transaction()` runs here
      // too. TypeORM's own `save()` and `remove()` don't.
      const transaction = vi.spyOn(EntityManager.prototype, 'transaction');

      await call(testRepository, entity);

      expect(transaction).not.toHaveBeenCalled();
      transaction.mockRestore();
    });

    it('a repository built by hand writes a versioned row', async () => {
      const dataSource = moduleFixture.get(getDataSourceToken());
      const bareRepository = new TypeOrmSqliteRepository(
        dataSource.getRepository(TestEntityFixture),
        { entityKey: 'bare-test-entity' },
      );
      bareRepository.bind({});
      const entity = await testFactory.create({ firstName: 'Alice' });

      const updated = await bareRepository.update(entity, { firstName: 'Bob' });

      expect(updated.firstName).toBe('Bob');
      expect(updated.version).toBe(entity.version + 1);
    });

    it('a write in a run joins it, and rolls back with it', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      await expect(
        transactionScope.run({}, async (txCtx) => {
          const updated = await testRepository.update(
            entity,
            { firstName: 'Bob' },
            { ctx: txCtx },
          );
          expect(updated.version).toBe(entity.version + 1);
          throw new Error('roll back');
        }),
      ).rejects.toThrow('roll back');

      const [stored] = await testRepository.find();
      expect(stored?.firstName).toBe('Alice');
      expect(stored?.version).toBe(entity.version);
    });
  });
});
