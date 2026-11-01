import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { RuntimeException } from '@concepta/nestjs-core';
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
    it('should not let a client-supplied version in data override the real version', async () => {
      const entity = await testFactory.create({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      const updated = await testRepository.update(entity, {
        firstName: 'Bob',
        version: 999, // deliberately spoofing version via the DTO
      });

      expect(updated.version).toBe(entity.version + 1);
    });

    it('should bump the version whatever version an upsert payload carries', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });
      await testRepository.upsert({ id: entity.id, firstName: 'Bob' });

      // The version the caller read before the write above.
      const result = await testRepository.upsert({
        id: entity.id,
        firstName: 'Carol',
        version: entity.version,
      });

      expect(result.version).toBe(entity.version + 2);
    });

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

  describe('optimistic locking without TransactionScope wired', () => {
    // A repository constructed by hand: RepositoryModule.forRoot() always
    // provides a TransactionScope, so only this path can lack one.
    let bareRepository: TypeOrmRepository<TestEntityFixture>;
    let transactionScope: TransactionScope;

    beforeEach(() => {
      const dataSource = moduleFixture.get(getDataSourceToken());
      bareRepository = new TypeOrmSqliteRepository(
        dataSource.getRepository(TestEntityFixture),
        { entityKey: 'bare-test-entity' },
      );
      bareRepository.bind({});
      transactionScope = moduleFixture.get(TransactionScope);
    });

    it('should throw rather than silently run unprotected when no transaction is active', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      await expect(
        bareRepository.update(entity, { firstName: 'Bob' }),
      ).rejects.toThrow(RuntimeException);
    });

    it('should still work correctly when the caller already provides an active transaction', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      const updated = await transactionScope.run({}, async (txCtx) =>
        bareRepository.update(entity, { firstName: 'Bob' }, { ctx: txCtx }),
      );

      expect(updated.firstName).toBe('Bob');
      expect(updated.version).toBe(entity.version + 1);
    });

    // delete/softDelete/restore only take on the transaction requirement
    // when the caller actually supplies `expectedVersion` — this is what
    // keeps #472 non-breaking for every existing caller of those methods.
    it.each([
      [
        'delete',
        (repo: TypeOrmRepository<TestEntityFixture>, e: TestEntityFixture) =>
          repo.delete(e),
      ],
      [
        'softDelete',
        (repo: TypeOrmRepository<TestEntityFixture>, e: TestEntityFixture) =>
          repo.softDelete(e),
      ],
      [
        'restore',
        (repo: TypeOrmRepository<TestEntityFixture>, e: TestEntityFixture) =>
          repo.restore(e),
      ],
    ] as const)(
      'should run %s unprotected, with no transaction requirement, when expectedVersion is omitted',
      async (_name, call) => {
        const entity = await testFactory.create({ firstName: 'Alice' });
        const result = await call(bareRepository, entity);
        expect(result).toBeDefined();
      },
    );

    it('should throw rather than silently run delete unprotected when expectedVersion is supplied with no transaction active', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      await expect(
        bareRepository.delete(entity, { expectedVersion: entity.version }),
      ).rejects.toThrow(RuntimeException);
    });
  });
});
