import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { RuntimeException } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  OptimisticLockException,
  RepositoryQueryException,
  SoftDeletedImmutableException,
  TransactionScope,
  Where,
} from '@concepta/nestjs-repository';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { TEST_ENTITY_TOKEN } from '../../__fixtures__/repository/config/test.constants.fixture.js';
import { TestEntityFixture } from '../../__fixtures__/repository/entity/test.entity.fixture.js';
import { TestFactoryFixture } from '../../__fixtures__/repository/factory/test.factory.fixture.js';
import { AppModuleFixture } from '../../__fixtures__/repository/module/app.module.fixture.js';
import { TypeOrmRepository } from '../typeorm-repository.js';

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

  it('should be loaded', () => {
    expect(testRepository).toBeInstanceOf(TypeOrmRepository);
  });

  describe('entityName', () => {
    it('should return the entity name', () => {
      expect(testRepository.metadata.name).toBe('TestEntityFixture');
    });
  });

  describe('metadata.columns', () => {
    it('should mark the version column as isVersion', () => {
      const versionColumn = testRepository.metadata.columns.find(
        (c) => c.name === 'version',
      );
      expect(versionColumn?.isVersion).toBe(true);
    });

    it('should not mark other columns as isVersion', () => {
      const otherColumns = testRepository.metadata.columns.filter(
        (c) => c.name !== 'version',
      );
      expect(otherColumns.length).toBeGreaterThan(0);
      expect(otherColumns.every((c) => c.isVersion === false)).toBe(true);
    });
  });

  describe('find', () => {
    it('should return empty array when no entities', async () => {
      const result = await testRepository.find();
      expect(result).toEqual([]);
    });

    it('should return entities', async () => {
      await testFactory.create({ firstName: 'Alice' });
      await testFactory.create({ firstName: 'Bob' });

      const result = await testRepository.find();
      const firstNames = result.map((e) => e.firstName).sort();
      expect(firstNames).toEqual(['Alice', 'Bob']);
    });

    it('should apply where conditions', async () => {
      await testFactory.create({ firstName: 'Alice' });
      await testFactory.create({ firstName: 'Bob' });

      const result = await testRepository.find({
        where: Where.eq('firstName', 'Alice'),
      });
      expect(result).toEqual([expect.objectContaining({ firstName: 'Alice' })]);
    });

    describe('where operators', () => {
      it('eq - should match equal values', async () => {
        await testFactory.create({ firstName: 'Alice' });
        await testFactory.create({ firstName: 'Bob' });

        const result = await testRepository.find({
          where: Where.eq('firstName', 'Alice'),
        });
        expect(result).toHaveLength(1);
        expect(result[0].firstName).toBe('Alice');
      });

      it('ne - should exclude matching values', async () => {
        await testFactory.create({ firstName: 'Alice' });
        await testFactory.create({ firstName: 'Bob' });

        const result = await testRepository.find({
          where: Where.ne('firstName', 'Alice'),
        });
        expect(result).toHaveLength(1);
        expect(result[0].firstName).toBe('Bob');
      });

      it('gt - should match greater than', async () => {
        await testFactory.create({ firstName: 'Alice' });
        const bob = await testFactory.create({ firstName: 'Bob' });
        await testRepository.update(bob, { lastName: 'Updated' });

        const result = await testRepository.find({
          where: Where.gt('version', 1),
        });
        expect(result).toHaveLength(1);
        expect(result[0].firstName).toBe('Bob');
      });

      it('gte - should match greater than or equal', async () => {
        await testFactory.create({ firstName: 'Alice' });
        const bob = await testFactory.create({ firstName: 'Bob' });
        await testRepository.update(bob, { lastName: 'Updated' });

        const result = await testRepository.find({
          where: Where.gte('version', 2),
        });
        expect(result).toHaveLength(1);
        expect(result[0].firstName).toBe('Bob');
      });

      it('lt - should match less than', async () => {
        await testFactory.create({ firstName: 'Alice' });
        const bob = await testFactory.create({ firstName: 'Bob' });
        await testRepository.update(bob, { lastName: 'Updated' });

        const result = await testRepository.find({
          where: Where.lt('version', 2),
        });
        expect(result).toHaveLength(1);
        expect(result[0].firstName).toBe('Alice');
      });

      it('lte - should match less than or equal', async () => {
        await testFactory.create({ firstName: 'Alice' });
        const bob = await testFactory.create({ firstName: 'Bob' });
        await testRepository.update(bob, { lastName: 'Updated' });

        const result = await testRepository.find({
          where: Where.lte('version', 1),
        });
        expect(result).toHaveLength(1);
        expect(result[0].firstName).toBe('Alice');
      });

      it('contains - should match containing substring', async () => {
        await testFactory.create({ firstName: 'Alice' });
        await testFactory.create({ firstName: 'Alicia' });
        await testFactory.create({ firstName: 'Bob' });

        const result = await testRepository.find({
          where: Where.contains('firstName', 'Ali'),
        });
        expect(result).toHaveLength(2);
        expect(result.map((e) => e.firstName).sort()).toEqual([
          'Alice',
          'Alicia',
        ]);
      });

      it('starts - should match prefix', async () => {
        await testFactory.create({ firstName: 'Alice' });
        await testFactory.create({ firstName: 'Bob' });
        await testFactory.create({ firstName: 'Alicia' });

        const result = await testRepository.find({
          where: Where.starts('firstName', 'Ali'),
        });
        expect(result).toHaveLength(2);
        expect(result.map((e) => e.firstName).sort()).toEqual([
          'Alice',
          'Alicia',
        ]);
      });

      it('ends - should match suffix', async () => {
        await testFactory.create({ firstName: 'Alice' });
        await testFactory.create({ firstName: 'Janice' });
        await testFactory.create({ firstName: 'Bob' });

        const result = await testRepository.find({
          where: Where.ends('firstName', 'ice'),
        });
        expect(result).toHaveLength(2);
        expect(result.map((e) => e.firstName).sort()).toEqual([
          'Alice',
          'Janice',
        ]);
      });

      it('in - should match values in array', async () => {
        await testFactory.create({ firstName: 'Alice' });
        await testFactory.create({ firstName: 'Bob' });
        await testFactory.create({ firstName: 'Charlie' });

        const result = await testRepository.find({
          where: Where.in('firstName', ['Alice', 'Charlie']),
        });
        expect(result).toHaveLength(2);
        expect(result.map((e) => e.firstName).sort()).toEqual([
          'Alice',
          'Charlie',
        ]);
      });

      it('isNull - should match null values', async () => {
        await testFactory.create({ firstName: 'Alice', lastName: 'Smith' });
        await testRepository.create({
          firstName: 'Bob',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lastName: null as any,
        });

        const result = await testRepository.find({
          where: Where.isNull('lastName'),
        });
        expect(result).toHaveLength(1);
        expect(result[0].firstName).toBe('Bob');
      });

      it('between - should match values in range', async () => {
        // Alice: version 1 (created)
        await testFactory.create({ firstName: 'Alice' });
        // Bob: version 2 (created + 1 update)
        const bob = await testFactory.create({ firstName: 'Bob' });
        await testRepository.update(bob, { lastName: 'Updated' });
        // Charlie: version 3 (created + 2 updates)
        const charlie = await testFactory.create({ firstName: 'Charlie' });
        const charlie2 = await testRepository.update(charlie, {
          lastName: 'First',
        });
        await testRepository.update(charlie2, { lastName: 'Second' });

        const result = await testRepository.find({
          where: Where.between('version', 2, 3),
        });
        expect(result).toHaveLength(2);
        expect(result.map((e) => e.firstName).sort()).toEqual([
          'Bob',
          'Charlie',
        ]);
      });

      it('not - should negate condition', async () => {
        await testFactory.create({ firstName: 'Alice' });
        await testFactory.create({ firstName: 'Alicia' });
        await testFactory.create({ firstName: 'Bob' });

        const result = await testRepository.find({
          where: Where.notContains('firstName', 'Ali'),
        });
        expect(result).toHaveLength(1);
        expect(result[0].firstName).toBe('Bob');
      });

      it('and - should combine conditions', async () => {
        await testFactory.create({ firstName: 'Alice', lastName: 'Smith' });
        await testFactory.create({ firstName: 'Alice', lastName: 'Jones' });
        await testFactory.create({ firstName: 'Bob', lastName: 'Smith' });

        const result = await testRepository.find({
          where: Where.and(
            Where.eq('firstName', 'Alice'),
            Where.eq('lastName', 'Smith'),
          ),
        });
        expect(result).toHaveLength(1);
        expect(result[0].firstName).toBe('Alice');
        expect(result[0].lastName).toBe('Smith');
      });

      it('or - should match either condition', async () => {
        await testFactory.create({ firstName: 'Alice' });
        await testFactory.create({ firstName: 'Bob' });
        await testFactory.create({ firstName: 'Charlie' });

        const result = await testRepository.find({
          where: Where.or(
            Where.eq('firstName', 'Alice'),
            Where.eq('firstName', 'Charlie'),
          ),
        });
        expect(result).toHaveLength(2);
        expect(result.map((e) => e.firstName).sort()).toEqual([
          'Alice',
          'Charlie',
        ]);
      });
    });

    it('should throw RepositoryQueryException on error', async () => {
      vi.spyOn(testRepository['repo'], 'find').mockImplementationOnce(() => {
        throw new Error();
      });

      await expect(testRepository.find()).rejects.toThrow(
        RepositoryQueryException,
      );
    });
  });

  describe('findOne', () => {
    it('should return null when not found', async () => {
      const result = await testRepository.findOne({
        where: Where.eq('firstName', 'NotFound'),
      });
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });

      const result = await testRepository.findOne({
        where: Where.eq('id', created.id),
      });
      expect(result).not.toBeNull();
      expect(result?.firstName).toBe('Alice');
    });

    it('should throw RepositoryQueryException on error', async () => {
      vi.spyOn(testRepository['repo'], 'findOne').mockImplementationOnce(() => {
        throw new Error();
      });

      await expect(testRepository.findOne({})).rejects.toThrow(
        RepositoryQueryException,
      );
    });
  });

  describe('count', () => {
    it('should return 0 when no entities', async () => {
      const result = await testRepository.count();
      expect(result).toBe(0);
    });

    it('should return count of entities', async () => {
      await testFactory.create({ firstName: 'Alice' });
      await testFactory.create({ firstName: 'Bob' });

      const result = await testRepository.count();
      expect(result).toBe(2);
    });

    it('should apply where conditions', async () => {
      await testFactory.create({ firstName: 'Alice' });
      await testFactory.create({ firstName: 'Bob' });

      const result = await testRepository.count({
        where: Where.eq('firstName', 'Alice'),
      });
      expect(result).toBe(1);
    });
  });

  describe('findAndCount', () => {
    it('should return empty array and 0 when no entities', async () => {
      const [entities, count] = await testRepository.findAndCount();
      expect(entities).toEqual([]);
      expect(count).toBe(0);
    });

    it('should return entities and count', async () => {
      await testFactory.create({ firstName: 'Alice' });
      await testFactory.create({ firstName: 'Bob' });

      const [entities, count] = await testRepository.findAndCount();
      expect(entities.length).toBe(2);
      expect(count).toBe(2);
    });

    it('should apply where conditions', async () => {
      await testFactory.create({ firstName: 'Alice' });
      await testFactory.create({ firstName: 'Bob' });

      const [entities, count] = await testRepository.findAndCount({
        where: Where.eq('firstName', 'Alice'),
      });
      expect(entities.length).toBe(1);
      expect(count).toBe(1);
      expect(entities[0].firstName).toBe('Alice');
    });

    it('should apply pagination with correct total', async () => {
      await testFactory.create({ firstName: 'Alice' });
      await testFactory.create({ firstName: 'Bob' });
      await testFactory.create({ firstName: 'Charlie' });

      const [entities, count] = await testRepository.findAndCount({
        take: 2,
      });
      expect(entities.length).toBe(2);
      expect(count).toBe(3);
    });
  });

  describe('transform', () => {
    it('should create entity instance without persisting', () => {
      const entity = testRepository.transform({ firstName: 'Alice' });
      expect(entity).toBeInstanceOf(TestEntityFixture);
      expect(entity.firstName).toBe('Alice');
      expect(entity.id).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create single entity', async () => {
      const created = await testRepository.create({ firstName: 'Alice' });

      expect(created.id).toBeDefined();
      expect(created.firstName).toBe('Alice');
    });
  });

  describe('createMany', () => {
    it('should create multiple entities', async () => {
      const created = await testRepository.createMany([
        { firstName: 'Alice' },
        { firstName: 'Bob' },
      ]);

      expect(created).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            firstName: 'Alice',
            id: expect.any(String),
          }),
          expect.objectContaining({ firstName: 'Bob', id: expect.any(String) }),
        ]),
      );
    });
  });

  describe('update', () => {
    it('should update entity by merging data', async () => {
      const entity = await testFactory.create({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      const updated = await testRepository.update(entity, { firstName: 'Bob' });

      expect(updated.firstName).toBe('Bob');
      expect(updated.lastName).toBe('Smith');
    });

    it('should increment version by exactly 1 on a successful update', async () => {
      const entity = await testFactory.create({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      const updated = await testRepository.update(entity, { firstName: 'Bob' });

      expect(updated.version).toBe(entity.version + 1);
    });

    it('should throw OptimisticLockException when the entity was concurrently modified since it was read', async () => {
      const entity = await testFactory.create({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      // A concurrent writer updates first, using the same originally-read entity.
      await testRepository.update(entity, { firstName: 'Concurrent' });

      // Our caller still holds the stale, pre-update `entity` — its version
      // no longer matches the row.
      await expect(
        testRepository.update(entity, { firstName: 'Bob' }),
      ).rejects.toThrow(OptimisticLockException);
    });

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

    it('should reject updating a soft-deleted entity', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });
      await testRepository.softDelete(created);
      const deleted = await testRepository.findOne({
        where: Where.eq('id', created.id),
        withDeleted: true,
      });
      if (!deleted) throw new Error('fixture precondition failed');

      await expect(
        testRepository.update(deleted, { firstName: 'Bob' }),
      ).rejects.toThrow(SoftDeletedImmutableException);
    });

    it('should update a soft-deleted entity when force is set', async () => {
      const created = await testFactory.create({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      await testRepository.softDelete(created);
      const deleted = await testRepository.findOne({
        where: Where.eq('id', created.id),
        withDeleted: true,
      });
      if (!deleted) throw new Error('fixture precondition failed');

      const updated = await testRepository.update(
        deleted,
        { firstName: 'Bob' },
        { force: true },
      );

      expect(updated.firstName).toBe('Bob');
      expect(updated.lastName).toBe('Smith');
      expect(updated.version).toBe(deleted.version + 1);
      expect(updated.dateDeleted).not.toBeNull();
    });
  });

  describe('replace', () => {
    it('should replace entity data', async () => {
      const entity = await testFactory.create({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      const replaced = await testRepository.replace(entity, {
        firstName: 'Bob',
        lastName: 'Jones',
      });

      expect(replaced.firstName).toBe('Bob');
      expect(replaced.lastName).toBe('Jones');
    });

    it('should increment version by exactly 1 on a successful replace', async () => {
      const entity = await testFactory.create({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      const replaced = await testRepository.replace(entity, {
        firstName: 'Bob',
        lastName: 'Jones',
      });

      expect(replaced.version).toBe(entity.version + 1);
    });

    it('should throw OptimisticLockException when the entity was concurrently modified since it was read', async () => {
      const entity = await testFactory.create({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      await testRepository.replace(entity, {
        firstName: 'Concurrent',
        lastName: 'Writer',
      });

      await expect(
        testRepository.replace(entity, { firstName: 'Bob', lastName: 'Jones' }),
      ).rejects.toThrow(OptimisticLockException);
    });

    it('should reject replacing a soft-deleted entity', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });
      await testRepository.softDelete(created);
      const deleted = await testRepository.findOne({
        where: Where.eq('id', created.id),
        withDeleted: true,
      });
      if (!deleted) throw new Error('fixture precondition failed');

      await expect(
        testRepository.replace(deleted, { firstName: 'Bob' }),
      ).rejects.toThrow(SoftDeletedImmutableException);
    });

    it('should replace a soft-deleted entity when force is set', async () => {
      const created = await testFactory.create({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      await testRepository.softDelete(created);
      const deleted = await testRepository.findOne({
        where: Where.eq('id', created.id),
        withDeleted: true,
      });
      if (!deleted) throw new Error('fixture precondition failed');

      const replaced = await testRepository.replace(
        deleted,
        { firstName: 'Bob', lastName: 'Jones' },
        { force: true },
      );

      expect(replaced.firstName).toBe('Bob');
      expect(replaced.lastName).toBe('Jones');
      expect(replaced.version).toBe(deleted.version + 1);
      expect(replaced.dateDeleted).not.toBeNull();
    });
  });

  describe('upsert', () => {
    it('should create entity when it does not exist', async () => {
      const id = 'new-upsert-id';
      const result = await testRepository.upsert({ id, firstName: 'Alice' });

      expect(result.id).toBe(id);
      expect(result.firstName).toBe('Alice');
    });

    it('should update entity when it exists', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      const result = await testRepository.upsert({
        id: entity.id,
        firstName: 'Bob',
      });

      expect(result.id).toBe(entity.id);
      expect(result.firstName).toBe('Bob');
    });

    it('should reject upserting over a soft-deleted row', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });
      await testRepository.softDelete(created);

      await expect(
        testRepository.upsert({ id: created.id, firstName: 'Bob' }),
      ).rejects.toThrow(SoftDeletedImmutableException);
    });

    it('should upsert over a soft-deleted row when force is set', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });
      await testRepository.softDelete(created);

      const result = await testRepository.upsert(
        { id: created.id, firstName: 'Bob' },
        { force: true },
      );

      expect(result.id).toBe(created.id);
      expect(result.firstName).toBe('Bob');
    });
  });

  describe('delete', () => {
    it('should delete single entity', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });
      await testRepository.delete(created);

      const result = await testRepository.findOne({
        where: Where.eq('id', created.id),
      });
      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should soft delete single entity', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });
      await testRepository.softDelete(created);

      // Entity should not be found with default query
      const result = await testRepository.findOne({
        where: Where.eq('id', created.id),
      });
      expect(result).toBeNull();

      // Entity should still exist with soft-deleted records
      const withDeleted = await testRepository.findOne({
        where: Where.eq('id', created.id),
        withDeleted: true,
      });
      expect(withDeleted).not.toBeNull();
      expect(withDeleted?.dateDeleted).not.toBeNull();
    });
  });

  describe('restore', () => {
    it('should recover single soft-deleted entity', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });
      await testRepository.softDelete(created);

      // Verify it's soft deleted
      const deleted = await testRepository.findOne({
        where: Where.eq('id', created.id),
        withDeleted: true,
      });
      expect(deleted?.dateDeleted).not.toBeNull();

      // Recover
      await testRepository.restore(deleted!);

      // Should now be findable
      const recovered = await testRepository.findOne({
        where: Where.eq('id', created.id),
      });
      expect(recovered).not.toBeNull();
      expect(recovered?.dateDeleted).toBeNull();
    });
  });

  describe('merge', () => {
    it('should merge entities', async () => {
      const entity = await testFactory.create({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      const merged = testRepository.merge(entity, { firstName: 'Bob' });

      expect(merged.firstName).toBe('Bob');
      expect(merged.lastName).toBe('Smith');
    });
  });

  describe('prepare', () => {
    it('should transform an empty object to an entity instance (#466)', () => {
      const result = testRepository.prepare({});
      expect(result).toBeInstanceOf(TestEntityFixture);
    });

    it('should return undefined for non-object', () => {
      const result = testRepository.prepare(
        'not-an-object' as unknown as object,
      );
      expect(result).toBeUndefined();
    });

    it('should transform plain object to entity instance', () => {
      const result = testRepository.prepare({ firstName: 'Alice' });
      expect(result).toBeInstanceOf(TestEntityFixture);
      expect(result?.firstName).toBe('Alice');
    });

    it('should return entity instance as-is', () => {
      const entity = new TestEntityFixture();
      entity.firstName = 'Alice';
      const result = testRepository.prepare(entity);
      expect(result).toBe(entity);
    });
  });

  describe('optimistic locking without TransactionScope wired', () => {
    // Mirrors TypeOrmRepositoryModule used directly, without
    // RepositoryModule.forRoot() — TransactionScope is only provided by
    // the latter, so a repository constructed this way never receives one.
    let bareRepository: TypeOrmRepository<TestEntityFixture>;
    let transactionScope: TransactionScope;

    beforeEach(() => {
      const dataSource = moduleFixture.get(getDataSourceToken());
      bareRepository = new TypeOrmRepository(
        dataSource.getRepository(TestEntityFixture),
        { entityKey: 'bare-test-entity' },
      );
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
  });
});
