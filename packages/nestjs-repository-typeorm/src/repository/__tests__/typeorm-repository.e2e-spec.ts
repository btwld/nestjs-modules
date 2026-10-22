import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { RuntimeException } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  OptimisticLockException,
  OrderBy,
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

    // Guards the column-list translation. TypeORM 1.x removed the string-array
    // form of `select` and throws on it, so this pins that we hand it the
    // object form. Asserts the whole entity, not just the selected fields,
    // since the failure to catch is extra columns coming back.
    it('should return only the selected columns', async () => {
      await testFactory.create({ firstName: 'Alice', lastName: 'Anderson' });

      const result = await testRepository.find({ select: ['id', 'firstName'] });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: expect.any(String),
        firstName: 'Alice',
      });
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

      it('nstarts - should exclude prefix', async () => {
        await testFactory.create({ firstName: 'Alice' });
        await testFactory.create({ firstName: 'Bob' });

        const result = await testRepository.find({
          where: Where.notStarts('firstName', 'Ali'),
        });
        expect(result.map((e) => e.firstName)).toEqual(['Bob']);
      });

      it('nends - should exclude suffix', async () => {
        await testFactory.create({ firstName: 'Alice' });
        await testFactory.create({ firstName: 'Bob' });

        const result = await testRepository.find({
          where: Where.notEnds('firstName', 'ice'),
        });
        expect(result.map((e) => e.firstName)).toEqual(['Bob']);
      });

      describe('text operators match wildcard characters literally', () => {
        beforeEach(async () => {
          for (const firstName of ['50%', '500', 'a_c', 'abc', 'x!y']) {
            await testFactory.create({ firstName });
          }
        });

        it.each([
          ['contains %', Where.contains('firstName', '%'), ['50%']],
          ['contains _', Where.contains('firstName', '_'), ['a_c']],
          ['contains !', Where.contains('firstName', '!'), ['x!y']],
          ['starts', Where.starts('firstName', 'a_'), ['a_c']],
          ['ends', Where.ends('firstName', '0%'), ['50%']],
          [
            'notContains',
            Where.notContains('firstName', '%'),
            ['500', 'a_c', 'abc', 'x!y'],
          ],
          [
            'notStarts',
            Where.notStarts('firstName', 'a_'),
            ['50%', '500', 'abc', 'x!y'],
          ],
          [
            'notEnds',
            Where.notEnds('firstName', '0%'),
            ['500', 'a_c', 'abc', 'x!y'],
          ],
        ])('%s', async (_, where, expected) => {
          const result = await testRepository.find({ where });
          expect(result.map((e) => e.firstName).sort()).toEqual(expected);
        });

        it('keeps each condition its own value within one query', async () => {
          const result = await testRepository.find({
            where: Where.and(
              Where.starts('firstName', 'a'),
              Where.ends('firstName', 'c'),
              Where.notContains('firstName', '_'),
            ),
          });
          expect(result.map((e) => e.firstName)).toEqual(['abc']);
        });
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

      it('nin - should exclude values in array', async () => {
        await testFactory.create({ firstName: 'Alice' });
        await testFactory.create({ firstName: 'Bob' });
        await testFactory.create({ firstName: 'Charlie' });

        const result = await testRepository.find({
          where: Where.notIn('firstName', ['Alice', 'Charlie']),
        });
        expect(result.map((e) => e.firstName)).toEqual(['Bob']);
      });

      it('notNull - should match non-null values', async () => {
        await testFactory.create({ firstName: 'Alice', lastName: 'Smith' });
        await testRepository.create({ firstName: 'Bob', lastName: null });

        const result = await testRepository.find({
          where: Where.notNull('lastName'),
        });
        expect(result.map((e) => e.firstName)).toEqual(['Alice']);
      });

      it('isNull - should match null values', async () => {
        await testFactory.create({ firstName: 'Alice', lastName: 'Smith' });
        await testRepository.create({ firstName: 'Bob', lastName: null });

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

      // The always-false clause renders as a real "match nothing" predicate
      // against a live database, not just at the AST level. How it composes
      // with other conditions is the repository's, tested there.
      it('never - should match nothing', async () => {
        await testFactory.create({ firstName: 'Alice' });

        const result = await testRepository.find({ where: Where.never() });
        expect(result).toEqual([]);
      });
    });

    describe('order and paging', () => {
      beforeEach(async () => {
        for (const firstName of ['Charlie', 'Alice', 'Bob']) {
          await testFactory.create({ firstName });
        }
      });

      it.each([
        ['ascending', OrderBy.asc('firstName'), ['Alice', 'Bob', 'Charlie']],
        ['descending', OrderBy.desc('firstName'), ['Charlie', 'Bob', 'Alice']],
      ])('sorts %s', async (_, order, expected) => {
        const result = await testRepository.find({ order: [order] });
        expect(result.map((e) => e.firstName)).toEqual(expected);
      });

      it('skips and takes in sort order', async () => {
        const result = await testRepository.find({
          order: [OrderBy.asc('firstName')],
          skip: 1,
          take: 1,
        });
        expect(result.map((e) => e.firstName)).toEqual(['Bob']);
      });
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

    it('should return null for Where.never(), even when a matching row exists', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });

      const result = await testRepository.findOne({
        where: Where.and(Where.eq('id', created.id), Where.never()),
      });
      expect(result).toBeNull();
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

    it('should return 0 for Where.never(), even when rows exist', async () => {
      await testFactory.create({ firstName: 'Alice' });

      const result = await testRepository.count({ where: Where.never() });
      expect(result).toBe(0);
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

    it('should return empty array and 0 for Where.never(), even when rows exist', async () => {
      await testFactory.create({ firstName: 'Alice' });

      const [entities, count] = await testRepository.findAndCount({
        where: Where.never(),
      });
      expect(entities).toEqual([]);
      expect(count).toBe(0);
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

  describe('create', () => {
    it('should create single entity', async () => {
      const created = await testRepository.create({ firstName: 'Alice' });

      expect(created.id).toBeDefined();
      expect(created.firstName).toBe('Alice');
    });

    it('should accept a caller-supplied primary key', async () => {
      const created = await testRepository.create({
        id: 'aaaaaaaa-0000-4000-8000-000000000001',
        firstName: 'Alice',
      });

      expect(created.id).toBe('aaaaaaaa-0000-4000-8000-000000000001');
    });

    it('should return database-populated columns', async () => {
      const created = await testRepository.create({ firstName: 'Alice' });

      expect(created.dateCreated).toBeInstanceOf(Date);
      expect(created.dateUpdated).toBeInstanceOf(Date);
      expect(created.version).toBe(1);
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

    it('should return entities in input order', async () => {
      const created = await testRepository.createMany([
        { firstName: 'First' },
        { firstName: 'Second' },
        { firstName: 'Third' },
      ]);

      expect(created.map((entity) => entity.firstName)).toEqual([
        'First',
        'Second',
        'Third',
      ]);
    });

    it('should return an empty array for an empty input', async () => {
      expect(await testRepository.createMany([])).toEqual([]);
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

    it('should bump the version of the row it updates', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      const result = await testRepository.upsert({
        id: entity.id,
        firstName: 'Bob',
      });

      expect(result.version).toBe(entity.version + 1);
    });

    it('should bump the version whatever version the payload carries', async () => {
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

    it('should insert with a generated key when the payload has none', async () => {
      const result = await testRepository.upsert({ firstName: 'Carol' });

      expect(result.id).toEqual(expect.any(String));
      expect(result.firstName).toBe('Carol');
    });

    it('should make an update holding the earlier version conflict', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });
      await testRepository.upsert({ id: entity.id, firstName: 'Bob' });

      await expect(
        testRepository.update(
          entity,
          { lastName: 'Smith' },
          { expectedVersion: entity.version },
        ),
      ).rejects.toThrow(OptimisticLockException);
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

    it('returns the deleted row with its key', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });

      expect(await testRepository.delete(created)).toEqual(created);
    });

    it('returns the deleted row with its key under expectedVersion', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });

      expect(
        await testRepository.delete(created, {
          expectedVersion: created.version,
        }),
      ).toEqual(created);
    });

    it('returns each row deleteMany deletes with its key', async () => {
      const alice = await testFactory.create({ firstName: 'Alice' });
      const bob = await testFactory.create({ firstName: 'Bob' });

      expect(await testRepository.deleteMany([alice, bob])).toEqual([
        alice,
        bob,
      ]);
    });

    it('should delete when expectedVersion matches', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      await testRepository.delete(entity, { expectedVersion: entity.version });

      const result = await testRepository.findOne({
        where: Where.eq('id', entity.id),
      });
      expect(result).toBeNull();
    });

    it('should reject a stale expectedVersion even though it matches the caller entity, when a concurrent write has since landed', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      // A concurrent writer updates first, bumping the row's real version.
      await testRepository.update(entity, { firstName: 'Concurrent' });

      // Our caller still holds the stale, pre-update `entity` and honestly
      // states its own (also stale) version — the in-memory check alone
      // would pass this; only the driver's atomic compare-and-swap against
      // the live row catches it.
      await expect(
        testRepository.delete(entity, { expectedVersion: entity.version }),
      ).rejects.toThrow(OptimisticLockException);

      const result = await testRepository.findOne({
        where: Where.eq('id', entity.id),
      });
      expect(result).not.toBeNull();
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

    it('should soft-delete when expectedVersion matches', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      await testRepository.softDelete(entity, {
        expectedVersion: entity.version,
      });

      const result = await testRepository.findOne({
        where: Where.eq('id', entity.id),
      });
      expect(result).toBeNull();
    });

    it('should reject a stale expectedVersion even though it matches the caller entity, when a concurrent write has since landed', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      // A concurrent writer updates first, bumping the row's real version.
      await testRepository.update(entity, { firstName: 'Concurrent' });

      await expect(
        testRepository.softDelete(entity, {
          expectedVersion: entity.version,
        }),
      ).rejects.toThrow(OptimisticLockException);

      const result = await testRepository.findOne({
        where: Where.eq('id', entity.id),
      });
      expect(result).not.toBeNull();
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

    it('should restore when expectedVersion matches', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });
      await testRepository.softDelete(created);
      const deleted = await testRepository.findOne({
        where: Where.eq('id', created.id),
        withDeleted: true,
      });
      if (!deleted) throw new Error('fixture precondition failed');

      await testRepository.restore(deleted, {
        expectedVersion: deleted.version,
      });

      const recovered = await testRepository.findOne({
        where: Where.eq('id', created.id),
      });
      expect(recovered?.dateDeleted).toBeNull();
    });

    it('should reject a stale expectedVersion even though it matches the caller entity, when a concurrent write has since landed', async () => {
      const created = await testFactory.create({ firstName: 'Alice' });
      await testRepository.softDelete(created);
      const deleted = await testRepository.findOne({
        where: Where.eq('id', created.id),
        withDeleted: true,
      });
      if (!deleted) throw new Error('fixture precondition failed');

      // A concurrent writer restores the row and deletes it again, bumping
      // its version.
      const restored = await testRepository.restore(deleted);
      await testRepository.softDelete(restored);

      await expect(
        testRepository.restore(deleted, { expectedVersion: deleted.version }),
      ).rejects.toThrow(OptimisticLockException);
    });
  });

  describe('optimistic locking without TransactionScope wired', () => {
    // A repository constructed by hand: RepositoryModule.forRoot() always
    // provides a TransactionScope, so only this path can lack one.
    let bareRepository: TypeOrmRepository<TestEntityFixture>;
    let transactionScope: TransactionScope;

    beforeEach(() => {
      const dataSource = moduleFixture.get(getDataSourceToken());
      bareRepository = new TypeOrmRepository(
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
