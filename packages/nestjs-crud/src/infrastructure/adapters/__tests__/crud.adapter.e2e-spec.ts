import { Column, Entity } from 'typeorm';

import {
  BadRequestException,
  NotFoundException,
  PlainLiteralObject,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActionEnum, AppContextHost, Operation } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepoCtx,
  RepositoryModule,
  SoftDeletedImmutableException,
  Where,
} from '@concepta/nestjs-repository';
import {
  CommonSqliteEntity,
  TypeOrmRepository,
  TypeOrmRepositoryModule,
} from '@concepta/nestjs-repository-typeorm';

import { mockCrudParsedQuery } from '../../../__fixtures__/crud/mocks/crud-parsed-query.mock.js';
import { CompanyEntity } from '../../../__fixtures__/typeorm/company/company.entity.js';
import { ProjectEntity } from '../../../__fixtures__/typeorm/project/project.entity.js';
import { UserEntity } from '../../../__fixtures__/typeorm/users/user.entity.js';
import { CrudCtx } from '../../interceptors/crud-context.overlay.js';
import { CrudContextInterface } from '../../interceptors/interfaces/crud-context.interface.js';
import { CrudAdapter } from '../crud.adapter.js';

// ─── Entity ─────────────────────────────────────────────────────────────────

@Entity()
class TestEntityFixture extends CommonSqliteEntity {
  @Column()
  firstName!: string;

  @Column({ nullable: true })
  lastName!: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ENTITY_TOKEN = 'test-adapter-entity';

// ─── Helpers ────────────────────────────────────────────────────────────────

function ctx(overrides?: Partial<CrudContextInterface<TestEntityFixture>>) {
  const host = new AppContextHost();
  host.defineOverlay(RepoCtx, { entity: ENTITY_TOKEN });
  host.defineOverlay(CrudCtx, {
    entity: 'TestEntityFixture',
    params: {},
    query: mockCrudParsedQuery<TestEntityFixture>(),
    options: {},
    operation: Operation.List,
    action: ActionEnum.READ,
    ...overrides,
  });
  return host.with(CrudCtx);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CrudAdapter (e2e)', () => {
  let moduleFixture: TestingModule;
  let repository: TypeOrmRepository<TestEntityFixture>;
  let adapter: CrudAdapter<TestEntityFixture>;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          synchronize: true,
          entities: [TestEntityFixture],
        }),
        RepositoryModule.forRoot({}),
        RepositoryModule.forFeature({
          module: TypeOrmRepositoryModule,
          entities: [{ key: ENTITY_TOKEN, entity: TestEntityFixture }],
        }),
      ],
    }).compile();

    repository = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
      getDynamicRepositoryToken(ENTITY_TOKEN),
    );

    adapter = new CrudAdapter(repository);
  });

  afterEach(async () => {
    await moduleFixture?.close();
  });

  async function seed(
    data: Partial<TestEntityFixture>,
  ): Promise<TestEntityFixture> {
    return repository.create(data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Metadata accessors
  // ═══════════════════════════════════════════════════════════════════════════

  describe('entityName', () => {
    it('should return repository metadata name', () => {
      expect(adapter.entityName()).toBe('TestEntityFixture');
    });
  });

  describe('entityType', () => {
    it('should return repository metadata type', () => {
      expect(adapter.entityType()).toBe(TestEntityFixture);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // list
  // ═══════════════════════════════════════════════════════════════════════════

  describe('list', () => {
    it('should return empty page info when no data', async () => {
      const result = await adapter.list(ctx());

      expect(result).toEqual({
        data: [],
        count: 0,
        total: 0,
        limit: 0,
        page: 1,
        pageCount: 1,
      });
    });

    it('should return all entities', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(ctx());

      expect(result.count).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('should apply limit and offset', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Bob' });
      await seed({ firstName: 'Charlie' });

      const result = await adapter.list(
        ctx({
          query: { ...mockCrudParsedQuery(), limit: 2, offset: 0 },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.limit).toBe(2);
    });

    it('should apply sort from query', async () => {
      await seed({ firstName: 'Charlie' });
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            sort: [{ field: 'firstName', order: 'ASC' }],
          },
          options: { query: {} },
        }),
      );

      expect(result.data.map((e) => e.firstName)).toEqual([
        'Alice',
        'Bob',
        'Charlie',
      ]);
    });

    it('should fall back to options sort when query sort empty', async () => {
      await seed({ firstName: 'Charlie' });
      await seed({ firstName: 'Alice' });

      const result = await adapter.list(
        ctx({
          options: {
            query: { sort: [{ field: 'firstName', order: 'ASC' }] },
          },
        }),
      );

      expect(result.data[0].firstName).toBe('Alice');
    });

    it('should filter by simple equality search', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('firstName', 'Alice')],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Alice');
    });

    it('should filter by $or search', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Bob' });
      await seed({ firstName: 'Charlie' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            or: [
              Where.eq('firstName', 'Alice'),
              Where.eq('firstName', 'Charlie'),
            ],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(2);
      const names = result.data.map((e) => e.firstName).sort();
      expect(names).toEqual(['Alice', 'Charlie']);
    });

    it('should filter by $and search', async () => {
      await seed({ firstName: 'Alice', lastName: 'Smith' });
      await seed({ firstName: 'Alice', lastName: 'Jones' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [
              Where.eq('firstName', 'Alice'),
              Where.eq('lastName', 'Smith'),
            ],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].lastName).toBe('Smith');
    });

    it('should filter by $or with additional fields ANDed', async () => {
      await seed({ firstName: 'Alice', lastName: 'Smith' });
      await seed({ firstName: 'Bob', lastName: 'Smith' });
      await seed({ firstName: 'Alice', lastName: 'Jones' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            search: {
              lastName: 'Smith',
              $or: [{ firstName: 'Alice' }, { firstName: 'Bob' }],
            },
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(2);
      const names = result.data.map((e) => e.firstName).sort();
      expect(names).toEqual(['Alice', 'Bob']);
    });

    it('should filter by $contains operator', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Alicia' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.contains('firstName', 'Ali')],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(2);
    });

    it('should filter by $starts operator', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.starts('firstName', 'Ali')],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Alice');
    });

    it('should filter by $ends operator', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Janice' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.ends('firstName', 'ice')],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(2);
    });

    it('should filter by $in operator', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Bob' });
      await seed({ firstName: 'Charlie' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.in('firstName', ['Alice', 'Charlie'])],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(2);
    });

    it('should filter by $ne operator', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.ne('firstName', 'Alice')],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Bob');
    });

    it('should filter by $nin operator', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Bob' });
      await seed({ firstName: 'Charlie' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.notIn('firstName', ['Alice', 'Bob'])],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Charlie');
    });

    it('should filter by $ncontains operator', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Alicia' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.notContains('firstName', 'Ali')],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Bob');
    });

    it('should filter by $null operator', async () => {
      await seed({ firstName: 'Alice', lastName: 'Smith' });
      await seed({ firstName: 'Bob' }); // lastName is null

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.isNull('lastName')],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Bob');
    });

    it('should filter by $nnull operator', async () => {
      await seed({ firstName: 'Alice', lastName: 'Smith' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.notNull('lastName')],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Alice');
    });

    it('should filter by null value (mapped to IS NULL)', async () => {
      await seed({ firstName: 'Alice', lastName: 'Smith' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.isNull('lastName')],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Bob');
    });

    it('should filter by $gt and $lt operators combined', async () => {
      await seed({ firstName: 'Alice' }); // version defaults to 1
      const e2 = await seed({ firstName: 'Bob' });
      await repository.update(e2, { firstName: 'Bob2' }); // bumps version to 2
      const e3 = await seed({ firstName: 'Charlie' });
      await repository.update(e3, { firstName: 'Charlie2' });
      await repository.update(
        (await repository.findOne({ where: Where.eq('id', e3.id) }))!,
        { firstName: 'Charlie3' },
      ); // bumps version to 3

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.gt('version', 1), Where.lt('version', 3)],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Bob2');
    });

    it('should filter by $gte operator', async () => {
      await seed({ firstName: 'Alice' }); // version 1
      const e2 = await seed({ firstName: 'Bob' });
      await repository.update(e2, { firstName: 'Bob2' }); // version 2

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.gte('version', 2)],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Bob2');
    });

    it('should filter by $lte operator', async () => {
      await seed({ firstName: 'Alice' }); // version 1
      const e2 = await seed({ firstName: 'Bob' });
      await repository.update(e2, { firstName: 'Bob2' }); // version 2

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.lte('version', 1)],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Alice');
    });

    it('should filter by $between operator', async () => {
      await seed({ firstName: 'Alice' }); // version 1
      const e2 = await seed({ firstName: 'Bob' });
      await repository.update(e2, { firstName: 'Bob2' }); // version 2
      const e3 = await seed({ firstName: 'Charlie' });
      await repository.update(e3, { firstName: 'Charlie2' });
      await repository.update(
        (await repository.findOne({ where: Where.eq('id', e3.id) }))!,
        { firstName: 'Charlie3' },
      ); // version 3

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.between('version', 1, 2)],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(2);
    });

    it('should handle $and with all-empty branches', async () => {
      await seed({ firstName: 'Alice' });

      const result = await adapter.list(
        ctx({
          query: mockCrudParsedQuery(),
          options: { query: {} },
        }),
      );

      // Empty filter/or arrays produce empty where -> returns all
      expect(result.data).toHaveLength(1);
    });

    it('should handle $and with one non-empty branch', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('firstName', 'Alice')],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Alice');
    });

    it('should handle $and with overlapping fields (merge conflict)', async () => {
      await seed({ firstName: 'Alice' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [
              Where.contains('firstName', 'A'),
              Where.contains('firstName', 'lice'),
            ],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Alice');
    });

    it('should filter by $or inside field operator with single operator', async () => {
      await seed({ firstName: 'Alice', lastName: 'Smith' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.isNull('lastName')],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Bob');
    });

    it('should filter by $or inside field operator with multiple operators', async () => {
      await seed({ firstName: 'Alice', lastName: 'Smith' });
      await seed({ firstName: 'Bob' });

      const result = await adapter.list(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            or: [Where.isNull('lastName'), Where.eq('lastName', 'Smith')],
          },
          options: { query: {} },
        }),
      );

      expect(result.data).toHaveLength(2);
    });

    it('should exclude soft-deleted by default', async () => {
      const entity = await seed({ firstName: 'Alice' });
      await repository.softDelete(entity);

      const result = await adapter.list(ctx());

      expect(result.data).toHaveLength(0);
    });

    it('should include soft-deleted when includeDeleted=1', async () => {
      const entity = await seed({ firstName: 'Alice' });
      await repository.softDelete(entity);

      const result = await adapter.list(
        ctx({ query: { ...mockCrudParsedQuery(), includeDeleted: 1 } }),
      );

      expect(result.data).toHaveLength(1);
    });

    it('should respect exclude query option', async () => {
      await seed({ firstName: 'Alice', lastName: 'Smith' });

      const result = await adapter.list(
        ctx({ options: { query: { exclude: ['lastName'] } } }),
      );

      expect(result.data[0].firstName).toBe('Alice');
    });

    it('should respect allow query option', async () => {
      await seed({ firstName: 'Alice' });

      const result = await adapter.list(
        ctx({ options: { query: { allow: ['firstName', 'id'] } } }),
      );

      expect(result.data[0].firstName).toBe('Alice');
    });

    it('should include persist fields in select', async () => {
      await seed({ firstName: 'Alice', lastName: 'Smith' });

      const result = await adapter.list(
        ctx({
          query: { ...mockCrudParsedQuery(), fields: ['firstName'] },
          options: { query: { persist: ['lastName'] } },
        }),
      );

      expect(result.data[0].firstName).toBe('Alice');
      expect(result.data[0].lastName).toBe('Smith');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // read
  // ═══════════════════════════════════════════════════════════════════════════

  describe('read', () => {
    it('should return entity when found', async () => {
      const entity = await seed({ firstName: 'Alice' });

      const result = await adapter.read(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
          },
        }),
      );

      expect(result.firstName).toBe('Alice');
    });

    it('should throw NotFoundException when not found', async () => {
      await expect(
        adapter.read(
          ctx({
            query: {
              ...mockCrudParsedQuery(),
              filter: [Where.eq('id', 'nonexistent-id')],
            },
          }),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include soft-deleted via includeDeleted=1', async () => {
      const entity = await seed({ firstName: 'Alice' });
      await repository.softDelete(entity);

      const result = await adapter.read(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
            includeDeleted: 1,
          },
        }),
      );

      expect(result.firstName).toBe('Alice');
      expect(result.dateDeleted).not.toBeNull();
    });

    it('should not find soft-deleted without includeDeleted', async () => {
      const entity = await seed({ firstName: 'Alice' });
      await repository.softDelete(entity);

      await expect(
        adapter.read(
          ctx({
            query: {
              ...mockCrudParsedQuery(),
              filter: [Where.eq('id', entity.id)],
            },
          }),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // create
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should create and return entity', async () => {
      const result = await adapter.create(ctx(), { firstName: 'Alice' });

      expect(result.id).toBeDefined();
      expect(result.firstName).toBe('Alice');
    });

    it('should throw BadRequestException for null dto', async () => {
      await expect(
        adapter.create(ctx(), null as unknown as PlainLiteralObject),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createBatch
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createBatch', () => {
    it('should create multiple entities', async () => {
      const result = await adapter.createBatch(ctx(), {
        bulk: [{ firstName: 'Alice' }, { firstName: 'Bob' }],
      });

      expect(result).toHaveLength(2);
      const names = result.map((e) => e.firstName).sort();
      expect(names).toEqual(['Alice', 'Bob']);
    });

    it('should throw BadRequestException for empty bulk', async () => {
      await expect(adapter.createBatch(ctx(), { bulk: [] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for null dto', async () => {
      await expect(
        adapter.createBatch(
          ctx(),
          null as unknown as { bulk: PlainLiteralObject[] },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when all items are invalid', async () => {
      await expect(
        adapter.createBatch(ctx(), {
          bulk: [null as unknown as PlainLiteralObject],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // update
  // ═══════════════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should find and update entity', async () => {
      const entity = await seed({ firstName: 'Alice', lastName: 'Smith' });

      const result = await adapter.update(
        ctx({
          params: { id: entity.id },
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
          },
        }),
        { firstName: 'Bob' },
      );

      expect(result.firstName).toBe('Bob');
      expect(result.lastName).toBe('Smith');
    });

    it('should throw NotFoundException when entity not found', async () => {
      await expect(
        adapter.update(
          ctx({
            params: { id: 'nonexistent' },
            query: {
              ...mockCrudParsedQuery(),
              filter: [Where.eq('id', 'nonexistent')],
            },
          }),
          { firstName: 'X' },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject updating a soft-deleted entity via includeDeleted=1', async () => {
      const entity = await seed({ firstName: 'Alice' });
      await repository.softDelete(entity);

      await expect(
        adapter.update(
          ctx({
            params: { id: entity.id },
            query: {
              ...mockCrudParsedQuery(),
              filter: [Where.eq('id', entity.id)],
              includeDeleted: 1,
            },
          }),
          { firstName: 'Bob' },
        ),
      ).rejects.toThrow(SoftDeletedImmutableException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // replace
  // ═══════════════════════════════════════════════════════════════════════════

  describe('replace', () => {
    it('should find and replace entity', async () => {
      const entity = await seed({ firstName: 'Alice', lastName: 'Smith' });

      const result = await adapter.replace(
        ctx({
          params: { id: entity.id },
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
          },
        }),
        { firstName: 'Bob', lastName: 'Jones' },
      );

      expect(result.firstName).toBe('Bob');
      expect(result.lastName).toBe('Jones');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // delete
  // ═══════════════════════════════════════════════════════════════════════════

  describe('delete', () => {
    it('should return null when returnDeleted is false', async () => {
      const entity = await seed({ firstName: 'Alice' });

      const result = await adapter.delete(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
          },
        }),
      );

      expect(result).toBeNull();
    });

    it('should return entity when returnDeleted is true', async () => {
      const entity = await seed({ firstName: 'Alice' });

      const result = await adapter.delete(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
          },
          options: { route: { returnDeleted: true } },
        }),
      );

      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Alice');
    });

    it('should permanently remove entity from database', async () => {
      const entity = await seed({ firstName: 'Alice' });

      await adapter.delete(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
          },
        }),
      );

      const found = await repository.findOne({
        where: Where.eq('id', entity.id),
        withDeleted: true,
      });
      expect(found).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // softDelete
  // ═══════════════════════════════════════════════════════════════════════════

  describe('softDelete', () => {
    it('should return null when returnDeleted is false', async () => {
      const entity = await seed({ firstName: 'Alice' });

      const result = await adapter.softDelete(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
          },
        }),
      );

      expect(result).toBeNull();
    });

    it('should return entity when returnDeleted is true', async () => {
      const entity = await seed({ firstName: 'Alice' });

      const result = await adapter.softDelete(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
          },
          options: { route: { returnDeleted: true } },
        }),
      );

      expect(result).not.toBeNull();
      expect(result!.dateDeleted).not.toBeNull();
    });

    it('should keep entity with dateDeleted set', async () => {
      const entity = await seed({ firstName: 'Alice' });

      await adapter.softDelete(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
          },
        }),
      );

      const found = await repository.findOne({
        where: Where.eq('id', entity.id),
        withDeleted: true,
      });
      expect(found).not.toBeNull();
      expect(found!.dateDeleted).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // restore
  // ═══════════════════════════════════════════════════════════════════════════

  describe('restore', () => {
    it('should return null when returnRestored is false', async () => {
      const entity = await seed({ firstName: 'Alice' });
      await repository.softDelete(entity);

      const result = await adapter.restore(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
          },
        }),
      );

      expect(result).toBeNull();
    });

    it('should return entity when returnRestored is true', async () => {
      const entity = await seed({ firstName: 'Alice' });
      await repository.softDelete(entity);

      const result = await adapter.restore(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
          },
          options: { route: { returnRestored: true } },
        }),
      );

      expect(result).not.toBeNull();
      expect(result!.dateDeleted).toBeNull();
    });

    it('should clear dateDeleted in database', async () => {
      const entity = await seed({ firstName: 'Alice' });
      await repository.softDelete(entity);

      await adapter.restore(
        ctx({
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', entity.id)],
          },
        }),
      );

      const found = await repository.findOne({
        where: Where.eq('id', entity.id),
      });
      expect(found).not.toBeNull();
      expect(found!.dateDeleted).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CrudAdapter relations (e2e)
// ═══════════════════════════════════════════════════════════════════════════

describe('CrudAdapter relations (e2e)', () => {
  const COMPANY_TOKEN = 'relation-company';
  const USER_TOKEN = 'relation-user';
  const PROJECT_TOKEN = 'relation-project';

  let moduleFixture: TestingModule;
  let companyRepo: TypeOrmRepository<CompanyEntity>;
  let userRepo: TypeOrmRepository<UserEntity>;
  let projectRepo: TypeOrmRepository<ProjectEntity>;
  let adapter: CrudAdapter<CompanyEntity>;

  function relCtx(overrides?: Partial<CrudContextInterface<CompanyEntity>>) {
    const host = new AppContextHost();
    host.defineOverlay(CrudCtx, {
      entity: 'CompanyEntity',
      params: {},
      query: mockCrudParsedQuery<CompanyEntity>(),
      options: {},
      operation: Operation.List,
      action: ActionEnum.READ,
      ...overrides,
    });
    return host.with(CrudCtx);
  }

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          synchronize: true,
          entities: [CompanyEntity, UserEntity, ProjectEntity],
        }),
        RepositoryModule.forRoot({}),
        RepositoryModule.forFeature({
          module: TypeOrmRepositoryModule,
          entities: [
            { key: COMPANY_TOKEN, entity: CompanyEntity },
            { key: USER_TOKEN, entity: UserEntity },
            { key: PROJECT_TOKEN, entity: ProjectEntity },
          ],
        }),
      ],
    }).compile();

    companyRepo = moduleFixture.get<TypeOrmRepository<CompanyEntity>>(
      getDynamicRepositoryToken(COMPANY_TOKEN),
    );
    userRepo = moduleFixture.get<TypeOrmRepository<UserEntity>>(
      getDynamicRepositoryToken(USER_TOKEN),
    );
    projectRepo = moduleFixture.get<TypeOrmRepository<ProjectEntity>>(
      getDynamicRepositoryToken(PROJECT_TOKEN),
    );

    adapter = new CrudAdapter(companyRepo);
  });

  afterEach(async () => {
    await moduleFixture?.close();
  });

  async function seedCompany(
    name: string,
    domain: string,
  ): Promise<CompanyEntity> {
    return companyRepo.create({
      name,
      domain,
      description: `${name} description`,
    });
  }

  async function seedUser(
    email: string,
    companyId: number,
  ): Promise<UserEntity> {
    return userRepo.create({
      email,
      isActive: true,
      firstName: email.split('@')[0],
      lastName: null,
      companyId,
    });
  }

  async function seedProject(
    projectName: string,
    companyId: number,
  ): Promise<ProjectEntity> {
    return projectRepo.create({ name: projectName, companyId });
  }

  function usersRelationCtx(): Partial<CrudContextInterface<CompanyEntity>> {
    return {
      options: {
        query: {
          join: [{ relation: 'users', joinType: 'LEFT' }],
        },
      },
    };
  }

  function projectsRelationCtx(): Partial<CrudContextInterface<CompanyEntity>> {
    return {
      options: {
        query: {
          join: [{ relation: 'projects', joinType: 'LEFT' }],
        },
      },
    };
  }

  function bothRelationsCtx(): Partial<CrudContextInterface<CompanyEntity>> {
    return {
      options: {
        query: {
          join: [
            { relation: 'users', joinType: 'LEFT' },
            { relation: 'projects', joinType: 'LEFT' },
          ],
        },
      },
    };
  }

  describe('list', () => {
    it('should populate users with single join', async () => {
      const company = await seedCompany('Acme', 'acme.com');
      await seedUser('alice@acme.com', company.id!);
      await seedUser('bob@acme.com', company.id!);

      const result = await adapter.list(relCtx(usersRelationCtx()));

      expect(result.data).toHaveLength(1);
      expect(result.data[0].users).toHaveLength(2);
      const emails = result.data[0].users!.map((u) => u.email).sort();
      expect(emails).toEqual(['alice@acme.com', 'bob@acme.com']);
    });

    it('should populate projects with single join', async () => {
      const company = await seedCompany('Acme', 'acme.com');
      await seedProject('Alpha', company.id!);
      await seedProject('Beta', company.id!);

      const result = await adapter.list(relCtx(projectsRelationCtx()));

      expect(result.data).toHaveLength(1);
      expect(result.data[0].projects).toHaveLength(2);
      const names = result.data[0].projects!.map((p) => p.name).sort();
      expect(names).toEqual(['Alpha', 'Beta']);
    });

    it('should populate both users and projects with two joins', async () => {
      const company = await seedCompany('Acme', 'acme.com');
      await seedUser('alice@acme.com', company.id!);
      await seedProject('Alpha', company.id!);

      const result = await adapter.list(relCtx(bothRelationsCtx()));

      expect(result.data).toHaveLength(1);
      expect(result.data[0].users).toHaveLength(1);
      expect(result.data[0].users![0].email).toBe('alice@acme.com');
      expect(result.data[0].projects).toHaveLength(1);
      expect(result.data[0].projects![0].name).toBe('Alpha');
    });

    it('should return companies without relations when no config', async () => {
      const company = await seedCompany('Acme', 'acme.com');
      await seedUser('alice@acme.com', company.id!);
      await seedProject('Alpha', company.id!);

      const result = await adapter.list(relCtx());

      expect(result.data).toHaveLength(1);
      expect(result.data[0].users).toBeUndefined();
      expect(result.data[0].projects).toBeUndefined();
    });
  });

  describe('read', () => {
    it('should return single entity with both relations', async () => {
      const company = await seedCompany('Acme', 'acme.com');
      await seedUser('alice@acme.com', company.id!);
      await seedProject('Alpha', company.id!);

      const result = await adapter.read(
        relCtx({
          ...bothRelationsCtx(),
          query: {
            ...mockCrudParsedQuery(),
            filter: [Where.eq('id', company.id)],
          },
        }),
      );

      expect(result.name).toBe('Acme');
      expect(result.users).toHaveLength(1);
      expect(result.users![0].email).toBe('alice@acme.com');
      expect(result.projects).toHaveLength(1);
      expect(result.projects![0].name).toBe('Alpha');
    });
  });

  describe('relation sort', () => {
    it('should sort by relation field ASC', async () => {
      const zebra = await seedCompany('Zebra Inc', 'zebra.com');
      const alpha = await seedCompany('Alpha Corp', 'alpha.com');
      await seedUser('zara@zebra.com', zebra.id!);
      await seedUser('alice@alpha.com', alpha.id!);

      const result = await adapter.list(
        relCtx({
          ...usersRelationCtx(),
          query: mockCrudParsedQuery<PlainLiteralObject>({
            sort: [{ field: 'email', order: 'ASC', relation: 'users' }],
          }),
        }),
      );

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Alpha Corp');
      expect(result.data[1].name).toBe('Zebra Inc');
    });

    it('should sort by relation field DESC', async () => {
      const zebra = await seedCompany('Zebra Inc', 'zebra.com');
      const alpha = await seedCompany('Alpha Corp', 'alpha.com');
      await seedUser('zara@zebra.com', zebra.id!);
      await seedUser('alice@alpha.com', alpha.id!);

      const result = await adapter.list(
        relCtx({
          ...usersRelationCtx(),
          query: mockCrudParsedQuery<PlainLiteralObject>({
            sort: [{ field: 'email', order: 'DESC', relation: 'users' }],
          }),
        }),
      );

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Zebra Inc');
      expect(result.data[1].name).toBe('Alpha Corp');
    });

    it('should combine root sort with relation sort', async () => {
      const zebra = await seedCompany('Zebra Inc', 'zebra.com');
      const alpha = await seedCompany('Alpha Corp', 'alpha.com');
      await seedUser('zara@zebra.com', zebra.id!);
      await seedUser('alice@alpha.com', alpha.id!);

      const result = await adapter.list(
        relCtx({
          ...usersRelationCtx(),
          query: mockCrudParsedQuery<PlainLiteralObject>({
            sort: [
              { field: 'name', order: 'ASC' },
              { field: 'email', order: 'DESC', relation: 'users' },
            ],
          }),
        }),
      );

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Alpha Corp');
      expect(result.data[1].name).toBe('Zebra Inc');
    });
  });
});
