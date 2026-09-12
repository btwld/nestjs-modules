import { Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';

import {
  AppContextHost,
  type AppContextInterface,
  DeepPartial,
  CoreModule,
  HooksCtx,
  OverlayRef,
} from '@concepta/nestjs-core';
import {
  RepositoryModule,
  RepoHook,
  // Read operation decorators
  BeforeRead,
  AfterRead,
  BeforeFind,
  AfterFind,
  BeforeFindOne,
  AfterFindOne,
  BeforeCount,
  AfterCount,
  BeforeFindAndCount,
  AfterFindAndCount,
  // Create operation decorators
  BeforeWrite,
  AfterWrite,
  BeforeCreate,
  AfterCreate,
  BeforeCreateMany,
  AfterCreateMany,
  // Update operation decorators
  BeforeUpdate,
  AfterUpdate,
  BeforeUpsert,
  AfterUpsert,
  BeforeReplace,
  AfterReplace,
  // Delete operation decorators
  BeforeDestroy,
  AfterDestroy,
  BeforeDelete,
  AfterDelete,
  // Lifecycle operation decorators
  BeforeTransition,
  AfterTransition,
  BeforeSoftDelete,
  AfterSoftDelete,
  BeforeRestore,
  AfterRestore,
  // Method types
  BeforeFindMethod,
  AfterFindMethod,
  BeforeFindOneMethod,
  AfterFindOneMethod,
  BeforeCountMethod,
  AfterCountMethod,
  BeforeFindAndCountMethod,
  AfterFindAndCountMethod,
  BeforeCreateMethod,
  AfterCreateMethod,
  BeforeCreateManyMethod,
  AfterCreateManyMethod,
  BeforeUpdateMethod,
  AfterUpdateMethod,
  BeforeUpsertMethod,
  AfterUpsertMethod,
  BeforeReplaceMethod,
  AfterReplaceMethod,
  BeforeDeleteMethod,
  AfterDeleteMethod,
  BeforeSoftDeleteMethod,
  AfterSoftDeleteMethod,
  BeforeRestoreMethod,
  AfterRestoreMethod,
  BeforeReadMethod,
  AfterReadMethod,
  BeforeWriteMethod,
  AfterWriteMethod,
  BeforeTransitionMethod,
  AfterTransitionMethod,
  BeforeDestroyMethod,
  AfterDestroyMethod,
  // Repository types (moved from nestjs-common)
  RepositoryFindOptions,
  RepositoryFindOneOptions,
  Where,
  getDynamicRepositoryToken,
} from '@concepta/nestjs-repository';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { ormConfig } from '../../__fixtures__/repository/config/ormconfig.fixture.js';
import { TEST_ENTITY_TOKEN } from '../../__fixtures__/repository/config/test.constants.fixture.js';
import { TestEntityFixture } from '../../__fixtures__/repository/entity/test.entity.fixture.js';
import { TestFactoryFixture } from '../../__fixtures__/repository/factory/test.factory.fixture.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';
import { TypeOrmRepository } from '../typeorm-repository.js';

// =============================================================================
// Comprehensive Hook Interface - All Repository Hooks
// =============================================================================

interface AllHooksInterface {
  // High-level semantic hooks
  beforeRead: BeforeReadMethod<TestEntityFixture>;
  afterRead: AfterReadMethod<TestEntityFixture>;
  beforeWrite: BeforeWriteMethod<TestEntityFixture>;
  afterWrite: AfterWriteMethod<TestEntityFixture>;
  beforeTransition: BeforeTransitionMethod<TestEntityFixture>;
  afterTransition: AfterTransitionMethod<TestEntityFixture>;
  beforeDestroy: BeforeDestroyMethod<TestEntityFixture>;
  afterDestroy: AfterDestroyMethod<TestEntityFixture>;

  // Fine-grained read hooks
  beforeFind: BeforeFindMethod<TestEntityFixture>;
  afterFind: AfterFindMethod<TestEntityFixture>;
  beforeFindOne: BeforeFindOneMethod<TestEntityFixture>;
  afterFindOne: AfterFindOneMethod<TestEntityFixture>;
  beforeCount: BeforeCountMethod<TestEntityFixture>;
  afterCount: AfterCountMethod;
  beforeFindAndCount: BeforeFindAndCountMethod<TestEntityFixture>;
  afterFindAndCount: AfterFindAndCountMethod<TestEntityFixture>;

  // Fine-grained create hooks
  beforeCreate: BeforeCreateMethod<TestEntityFixture>;
  afterCreate: AfterCreateMethod<TestEntityFixture>;
  beforeCreateMany: BeforeCreateManyMethod<TestEntityFixture>;
  afterCreateMany: AfterCreateManyMethod<TestEntityFixture>;

  // Fine-grained update hooks
  beforeUpdate: BeforeUpdateMethod<TestEntityFixture>;
  afterUpdate: AfterUpdateMethod<TestEntityFixture>;
  beforeUpsert: BeforeUpsertMethod<TestEntityFixture>;
  afterUpsert: AfterUpsertMethod<TestEntityFixture>;
  beforeReplace: BeforeReplaceMethod<TestEntityFixture>;
  afterReplace: AfterReplaceMethod<TestEntityFixture>;

  // Fine-grained delete hooks
  beforeDelete: BeforeDeleteMethod<TestEntityFixture>;
  afterDelete: AfterDeleteMethod<TestEntityFixture>;

  // Fine-grained lifecycle hooks
  beforeSoftDelete: BeforeSoftDeleteMethod<TestEntityFixture>;
  afterSoftDelete: AfterSoftDeleteMethod<TestEntityFixture>;
  beforeRestore: BeforeRestoreMethod<TestEntityFixture>;
  afterRestore: AfterRestoreMethod<TestEntityFixture>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

@RepoHook()
class AllHooks implements AllHooksInterface {
  callLog: string[] = [];

  // High-level semantic hooks
  @BeforeRead()
  async beforeRead(options: RepositoryFindOptions<TestEntityFixture>) {
    this.callLog.push('beforeRead');
    return options;
  }

  // AfterRead has a union return type since it handles all read operations
  // (find, findOne, count, findAndCount). In practice, use specific hooks instead.
  @AfterRead()
  async afterRead(
    result:
      | TestEntityFixture
      | TestEntityFixture[]
      | null
      | number
      | [TestEntityFixture[], number],
  ) {
    this.callLog.push('afterRead');
    return result;
  }

  @BeforeWrite()
  async beforeWrite(
    data: DeepPartial<TestEntityFixture> | DeepPartial<TestEntityFixture>[],
  ) {
    this.callLog.push('beforeWrite');
    return data;
  }

  @AfterWrite()
  async afterWrite(result: TestEntityFixture | TestEntityFixture[]) {
    this.callLog.push('afterWrite');
    return result;
  }

  @BeforeTransition()
  async beforeTransition(entity: TestEntityFixture) {
    this.callLog.push('beforeTransition');
    return entity;
  }

  @AfterTransition()
  async afterTransition(result: TestEntityFixture) {
    this.callLog.push('afterTransition');
    return result;
  }

  @BeforeDestroy()
  async beforeDestroy(entity: TestEntityFixture) {
    this.callLog.push('beforeDestroy');
    return entity;
  }

  @AfterDestroy()
  async afterDestroy(result: TestEntityFixture) {
    this.callLog.push('afterDestroy');
    return result;
  }

  // Fine-grained read hooks
  @BeforeFind()
  async beforeFind(options: RepositoryFindOptions<TestEntityFixture>) {
    this.callLog.push('beforeFind');
    return options;
  }

  @AfterFind()
  async afterFind(result: TestEntityFixture[]) {
    this.callLog.push('afterFind');
    return result;
  }

  @BeforeFindOne()
  async beforeFindOne(options: RepositoryFindOneOptions<TestEntityFixture>) {
    this.callLog.push('beforeFindOne');
    return options;
  }

  @AfterFindOne()
  async afterFindOne(result: TestEntityFixture | null) {
    this.callLog.push('afterFindOne');
    return result;
  }

  @BeforeCount()
  async beforeCount(options: RepositoryFindOptions<TestEntityFixture>) {
    this.callLog.push('beforeCount');
    return options;
  }

  @AfterCount()
  async afterCount(result: number) {
    this.callLog.push('afterCount');
    return result;
  }

  @BeforeFindAndCount()
  async beforeFindAndCount(options: RepositoryFindOptions<TestEntityFixture>) {
    this.callLog.push('beforeFindAndCount');
    return options;
  }

  @AfterFindAndCount()
  async afterFindAndCount(result: [TestEntityFixture[], number]) {
    this.callLog.push('afterFindAndCount');
    return result;
  }

  // Fine-grained create hooks
  @BeforeCreate()
  async beforeCreate(data: DeepPartial<TestEntityFixture>) {
    this.callLog.push('beforeCreate');
    return data;
  }

  @AfterCreate()
  async afterCreate(result: TestEntityFixture) {
    this.callLog.push('afterCreate');
    return result;
  }

  @BeforeCreateMany()
  async beforeCreateMany(data: DeepPartial<TestEntityFixture>[]) {
    this.callLog.push('beforeCreateMany');
    return data;
  }

  @AfterCreateMany()
  async afterCreateMany(result: TestEntityFixture[]) {
    this.callLog.push('afterCreateMany');
    return result;
  }

  // Fine-grained update hooks
  @BeforeUpdate()
  async beforeUpdate(data: DeepPartial<TestEntityFixture>) {
    this.callLog.push('beforeUpdate');
    return data;
  }

  @AfterUpdate()
  async afterUpdate(result: TestEntityFixture) {
    this.callLog.push('afterUpdate');
    return result;
  }

  @BeforeUpsert()
  async beforeUpsert(data: DeepPartial<TestEntityFixture>) {
    this.callLog.push('beforeUpsert');
    return data;
  }

  @AfterUpsert()
  async afterUpsert(result: TestEntityFixture) {
    this.callLog.push('afterUpsert');
    return result;
  }

  @BeforeReplace()
  async beforeReplace(data: DeepPartial<TestEntityFixture>) {
    this.callLog.push('beforeReplace');
    return data;
  }

  @AfterReplace()
  async afterReplace(result: TestEntityFixture) {
    this.callLog.push('afterReplace');
    return result;
  }

  // Fine-grained delete hooks
  @BeforeDelete()
  async beforeDelete(entity: TestEntityFixture) {
    this.callLog.push('beforeDelete');
    return entity;
  }

  @AfterDelete()
  async afterDelete(result: TestEntityFixture) {
    this.callLog.push('afterDelete');
    return result;
  }

  // Fine-grained lifecycle hooks
  @BeforeSoftDelete()
  async beforeSoftDelete(entity: TestEntityFixture) {
    this.callLog.push('beforeSoftDelete');
    return entity;
  }

  @AfterSoftDelete()
  async afterSoftDelete(result: TestEntityFixture) {
    this.callLog.push('afterSoftDelete');
    return result;
  }

  @BeforeRestore()
  async beforeRestore(entity: TestEntityFixture) {
    this.callLog.push('beforeRestore');
    return entity;
  }

  @AfterRestore()
  async afterRestore(result: TestEntityFixture) {
    this.callLog.push('afterRestore');
    return result;
  }
}

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a hook context with the given hooks.
 * Adds the RepoHook.KEY type to each hook config (normally done by HookInterceptor).
 */
function createHookContext(...hookClasses: Type[]) {
  const ctx = new AppContextHost();
  ctx.defineOverlay(HooksCtx, {
    hooks: hookClasses.map((hook) => ({ hook, type: RepoHook.KEY })),
  });
  return ctx;
}

// =============================================================================
// Tests
// =============================================================================

describe('TypeOrmRepository Hooks', () => {
  let moduleFixture: TestingModule;
  let testRepository: TypeOrmRepository<TestEntityFixture>;
  let allHooks: AllHooks;
  let seedingSource: SeedingSource;
  let testFactory: TestFactoryFixture;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(ormConfig),
        CoreModule.forRoot(),
        RepositoryModule.forRoot({}),
        RepositoryModule.forFeature({
          module: TypeOrmRepositoryModule,
          entities: [
            {
              key: TEST_ENTITY_TOKEN,
              entity: TestEntityFixture,
            },
          ],
        }),
      ],
      providers: [AllHooks],
    }).compile();

    testRepository = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
      getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
    );

    // Get the hook instance that was created by the module
    // This is the same instance that will be resolved by HookResolverService
    allHooks = moduleFixture.get(AllHooks);

    seedingSource = new SeedingSource({
      dataSource: moduleFixture.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    testFactory = new TestFactoryFixture({
      entity: TestEntityFixture,
      seedingSource,
    });
  });

  afterEach(async () => {
    allHooks.callLog = [];
    vi.clearAllMocks();
    await moduleFixture.close();
  });

  // ===========================================================================
  // Read Operations
  // ===========================================================================

  describe('find()', () => {
    it('should call BeforeRead, BeforeFind, AfterFind, AfterRead in order', async () => {
      await testFactory.create({ firstName: 'Alice' });
      await testFactory.create({ firstName: 'Bob' });

      const result = await testRepository.find({
        ctx: createHookContext(AllHooks),
      });

      expect(allHooks.callLog).toEqual([
        'beforeRead',
        'beforeFind',
        'afterFind',
        'afterRead',
      ]);
      expect(result.length).toBe(2);
    });

    it('should not call hooks when no hooks in context', async () => {
      await testFactory.create({ firstName: 'Alice' });

      const result = await testRepository.find();

      expect(allHooks.callLog).toEqual([]);
      expect(result.length).toBe(1);
    });
  });

  describe('findOne()', () => {
    it('should call BeforeRead, BeforeFindOne, AfterFindOne, AfterRead in order', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      const result = await testRepository.findOne({
        where: Where.eq('id', entity.id),
        ctx: createHookContext(AllHooks),
      });

      expect(allHooks.callLog).toEqual([
        'beforeRead',
        'beforeFindOne',
        'afterFindOne',
        'afterRead',
      ]);
      expect(result?.firstName).toBe('Alice');
    });

    it('should call hooks even when entity not found', async () => {
      const result = await testRepository.findOne({
        where: Where.eq('id', 'non-existent-id'),
        ctx: createHookContext(AllHooks),
      });

      expect(allHooks.callLog).toEqual([
        'beforeRead',
        'beforeFindOne',
        'afterFindOne',
        'afterRead',
      ]);
      expect(result).toBeNull();
    });
  });

  describe('count()', () => {
    it('should call BeforeRead, BeforeCount, AfterCount in order', async () => {
      await testFactory.create({ firstName: 'Alice' });
      await testFactory.create({ firstName: 'Bob' });

      const result = await testRepository.count({
        ctx: createHookContext(AllHooks),
      });

      expect(allHooks.callLog).toEqual([
        'beforeRead',
        'beforeCount',
        'afterCount',
      ]);
      expect(result).toBe(2);
    });
  });

  describe('findAndCount()', () => {
    it('should call BeforeRead, BeforeFindAndCount, AfterFindAndCount in order', async () => {
      await testFactory.create({ firstName: 'Alice' });
      await testFactory.create({ firstName: 'Bob' });

      const [entities, count] = await testRepository.findAndCount({
        ctx: createHookContext(AllHooks),
      });

      expect(allHooks.callLog).toEqual([
        'beforeRead',
        'beforeFindAndCount',
        'afterFindAndCount',
      ]);
      expect(entities.length).toBe(2);
      expect(count).toBe(2);
    });
  });

  // ===========================================================================
  // Create Operations
  // ===========================================================================

  describe('create()', () => {
    it('should call BeforeWrite, BeforeCreate, AfterCreate, AfterWrite in order', async () => {
      const result = await testRepository.create(
        { firstName: 'Alice', lastName: 'Smith' },
        {
          ctx: createHookContext(AllHooks),
        },
      );

      expect(allHooks.callLog).toEqual([
        'beforeWrite',
        'beforeCreate',
        'afterCreate',
        'afterWrite',
      ]);
      expect(result.firstName).toBe('Alice');
      expect(result.id).toBeDefined();
    });
  });

  describe('createMany()', () => {
    it('should call BeforeWrite, BeforeCreateMany, AfterCreateMany, AfterWrite in order', async () => {
      const result = await testRepository.createMany(
        [
          { firstName: 'Alice', lastName: 'Smith' },
          { firstName: 'Bob', lastName: 'Jones' },
        ],
        {
          ctx: createHookContext(AllHooks),
        },
      );

      expect(allHooks.callLog).toEqual([
        'beforeWrite',
        'beforeCreateMany',
        'afterCreateMany',
        'afterWrite',
      ]);
      expect(result.length).toBe(2);
      expect(result[0].firstName).toBe('Alice');
      expect(result[1].firstName).toBe('Bob');
    });
  });

  // ===========================================================================
  // Update Operations
  // ===========================================================================

  describe('update()', () => {
    it('should call BeforeWrite, BeforeUpdate, AfterUpdate, AfterWrite in order', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      const result = await testRepository.update(
        entity,
        { lastName: 'Updated' },
        {
          ctx: createHookContext(AllHooks),
        },
      );

      expect(allHooks.callLog).toEqual([
        'beforeWrite',
        'beforeUpdate',
        'afterUpdate',
        'afterWrite',
      ]);
      expect(result.lastName).toBe('Updated');
    });
  });

  describe('upsert()', () => {
    it('should call BeforeWrite, BeforeUpsert, AfterUpsert, AfterWrite in order for insert', async () => {
      const id = '00000000-0000-0000-0000-000000000001';

      const result = await testRepository.upsert(
        { id, firstName: 'Alice', lastName: 'Smith' },
        {
          ctx: createHookContext(AllHooks),
        },
      );

      expect(allHooks.callLog).toEqual([
        'beforeWrite',
        'beforeUpsert',
        'afterUpsert',
        'afterWrite',
      ]);
      expect(result.firstName).toBe('Alice');
      expect(result.id).toBe(id);
    });

    it('should call hooks for upsert update', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      const result = await testRepository.upsert(
        { id: entity.id, firstName: 'Alice Updated', lastName: 'Smith' },
        {
          ctx: createHookContext(AllHooks),
        },
      );

      expect(allHooks.callLog).toEqual([
        'beforeWrite',
        'beforeUpsert',
        'afterUpsert',
        'afterWrite',
      ]);
      expect(result.firstName).toBe('Alice Updated');
    });
  });

  describe('replace()', () => {
    it('should call BeforeWrite, BeforeReplace, AfterReplace, AfterWrite in order', async () => {
      const entity = await testFactory.create({
        firstName: 'Alice',
        lastName: 'Smith',
      });

      const result = await testRepository.replace(
        entity,
        { firstName: 'Replaced', lastName: 'Name' },
        {
          ctx: createHookContext(AllHooks),
        },
      );

      expect(allHooks.callLog).toEqual([
        'beforeWrite',
        'beforeReplace',
        'afterReplace',
        'afterWrite',
      ]);
      expect(result.firstName).toBe('Replaced');
      expect(result.lastName).toBe('Name');
    });
  });

  // ===========================================================================
  // Delete Operations
  // ===========================================================================

  describe('delete()', () => {
    it('should call BeforeDestroy, BeforeDelete, AfterDelete, AfterDestroy in order', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      const result = await testRepository.delete(entity, {
        ctx: createHookContext(AllHooks),
      });

      expect(allHooks.callLog).toEqual([
        'beforeDestroy',
        'beforeDelete',
        'afterDelete',
        'afterDestroy',
      ]);
      expect(result.firstName).toBe('Alice');

      // Verify entity was actually deleted
      const found = await testRepository.findOne({
        where: Where.eq('id', entity.id),
      });
      expect(found).toBeNull();
    });
  });

  // ===========================================================================
  // Lifecycle Operations (soft delete/restore)
  // ===========================================================================

  describe('softDelete()', () => {
    it('should call BeforeTransition, BeforeSoftDelete, AfterSoftDelete, AfterTransition in order', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      const result = await testRepository.softDelete(entity, {
        ctx: createHookContext(AllHooks),
      });

      expect(allHooks.callLog).toEqual([
        'beforeTransition',
        'beforeSoftDelete',
        'afterSoftDelete',
        'afterTransition',
      ]);
      expect(result.dateDeleted).toBeDefined();

      // Verify entity is soft deleted (not returned by default query)
      const found = await testRepository.findOne({
        where: Where.eq('id', entity.id),
      });
      expect(found).toBeNull();
    });
  });

  describe('restore()', () => {
    it('should call BeforeTransition, BeforeRestore, AfterRestore, AfterTransition in order', async () => {
      const entity = await testFactory.create({ firstName: 'Alice' });

      // First soft delete
      await testRepository.softDelete(entity);
      allHooks.callLog = []; // Reset call log

      // Then restore
      const result = await testRepository.restore(entity, {
        ctx: createHookContext(AllHooks),
      });

      expect(allHooks.callLog).toEqual([
        'beforeTransition',
        'beforeRestore',
        'afterRestore',
        'afterTransition',
      ]);
      expect(result.dateDeleted).toBeNull();

      // Verify entity is restored (returned by default query)
      const found = await testRepository.findOne({
        where: Where.eq('id', entity.id),
      });
      expect(found).not.toBeNull();
    });
  });

  // ===========================================================================
  // Hook Modification Tests
  // ===========================================================================

  describe('hook data modification', () => {
    it('should preserve caller original data over hook modifications on write', async () => {
      await moduleFixture.close();

      // Hook tries to override lastName, but preserve strategy keeps the original
      @RepoHook()
      class ModifyingHook {
        @BeforeCreate()
        async beforeCreate(data: DeepPartial<TestEntityFixture>) {
          return { ...data, lastName: 'Hook tried to override' };
        }
      }

      moduleFixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormConfig),
          CoreModule.forRoot(),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: TEST_ENTITY_TOKEN,
                entity: TestEntityFixture,
              },
            ],
          }),
        ],
        providers: [ModifyingHook],
      }).compile();

      const repo = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
        getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
      );

      const result = await repo.create(
        { firstName: 'Alice', lastName: 'Original' },
        {
          ctx: createHookContext(ModifyingHook),
        },
      );

      // preserve strategy: caller's original data wins
      expect(result.lastName).toBe('Original');
    });

    it('should allow hooks to add new fields on write', async () => {
      await moduleFixture.close();

      // Hook adds a field that was NOT in the caller's original data
      @RepoHook()
      class AddFieldHook {
        @BeforeCreate()
        async beforeCreate(data: DeepPartial<TestEntityFixture>) {
          return { ...data, lastName: 'Added by hook' };
        }
      }

      moduleFixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormConfig),
          CoreModule.forRoot(),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: TEST_ENTITY_TOKEN,
                entity: TestEntityFixture,
              },
            ],
          }),
        ],
        providers: [AddFieldHook],
      }).compile();

      const repo = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
        getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
      );

      // Caller does NOT provide lastName — hook can add it
      const result = await repo.create(
        { firstName: 'Alice' },
        {
          ctx: createHookContext(AddFieldHook),
        },
      );

      expect(result.firstName).toBe('Alice');
      expect(result.lastName).toBe('Added by hook');
    });

    it('should let a { replace: true } hook override caller-supplied data on write', async () => {
      await moduleFixture.close();

      // Hook is declared authoritative — its output should win even though
      // the caller supplied a conflicting value.
      @RepoHook()
      class TenantStampHook {
        @BeforeCreate({ replace: true })
        async beforeCreate(data: DeepPartial<TestEntityFixture>) {
          return { ...data, lastName: 'Stamped by hook' };
        }
      }

      moduleFixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormConfig),
          CoreModule.forRoot(),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: TEST_ENTITY_TOKEN,
                entity: TestEntityFixture,
              },
            ],
          }),
        ],
        providers: [TenantStampHook],
      }).compile();

      const repo = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
        getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
      );

      // Caller explicitly supplies lastName — a plain @BeforeCreate() hook
      // would lose here (see "should preserve caller original data..."
      // above); { replace: true } must win instead.
      const result = await repo.create(
        { firstName: 'Alice', lastName: 'Caller supplied' },
        {
          ctx: createHookContext(TenantStampHook),
        },
      );

      expect(result.firstName).toBe('Alice');
      expect(result.lastName).toBe('Stamped by hook');
    });

    it('should still let a plain @BeforeCreate() hook merge alongside a { replace: true } one', async () => {
      await moduleFixture.close();

      // Non-authoritative hook adds a field the caller omitted; authoritative
      // hook overrides a field the caller supplied. Both should apply — and
      // both must actually run, not just "caller's value happens to survive
      // regardless." callLog proves execution independently of the merge
      // outcome on firstName, since a merge hook losing to the caller looks
      // identical to a merge hook never running at all if callLog isn't checked.
      @RepoHook()
      class MixedHook {
        callLog: string[] = [];

        @BeforeCreate()
        async enrich(data: DeepPartial<TestEntityFixture>) {
          this.callLog.push('enrich');
          return { ...data, firstName: 'Hook default (should lose)' };
        }

        @BeforeCreate({ replace: true })
        async stamp(data: DeepPartial<TestEntityFixture>) {
          this.callLog.push('stamp');
          return { ...data, lastName: 'Stamped by hook' };
        }
      }

      moduleFixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormConfig),
          CoreModule.forRoot(),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: TEST_ENTITY_TOKEN,
                entity: TestEntityFixture,
              },
            ],
          }),
        ],
        providers: [MixedHook],
      }).compile();

      const repo = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
        getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
      );
      const mixedHook = moduleFixture.get(MixedHook);

      const result = await repo.create(
        { firstName: 'Alice', lastName: 'Caller supplied' },
        {
          ctx: createHookContext(MixedHook),
        },
      );

      // Both hooks actually ran (not just "caller's value happened to win").
      expect(mixedHook.callLog).toEqual(
        expect.arrayContaining(['enrich', 'stamp']),
      );
      // Caller's firstName wins over the merge-phase hook (default behavior).
      expect(result.firstName).toBe('Alice');
      // The replace-phase hook wins over the caller's lastName.
      expect(result.lastName).toBe('Stamped by hook');
    });

    it('should allow BeforeFind to add where conditions', async () => {
      await moduleFixture.close();

      @RepoHook()
      class FilteringHook {
        @BeforeFind()
        async beforeFind(options: RepositoryFindOptions<TestEntityFixture>) {
          return {
            ...options,
            where: options.where
              ? Where.and(options.where, Where.eq('firstName', 'Bob'))
              : Where.eq('firstName', 'Bob'),
          };
        }
      }

      moduleFixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormConfig),
          CoreModule.forRoot(),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: TEST_ENTITY_TOKEN,
                entity: TestEntityFixture,
              },
            ],
          }),
        ],
        providers: [FilteringHook],
      }).compile();

      const repo = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
        getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
      );

      const localSeedingSource = new SeedingSource({
        dataSource: moduleFixture.get(getDataSourceToken()),
      });
      await localSeedingSource.initialize();

      const localFactory = new TestFactoryFixture({
        entity: TestEntityFixture,
        seedingSource: localSeedingSource,
      });

      await localFactory.create({ firstName: 'Alice' });
      await localFactory.create({ firstName: 'Bob' });
      await localFactory.create({ firstName: 'Charlie' });

      const result = await repo.find({
        ctx: createHookContext(FilteringHook),
      });

      // Hook filters to only return 'Bob'
      expect(result.length).toBe(1);
      expect(result[0].firstName).toBe('Bob');
    });
  });

  // ===========================================================================
  // README tenant-isolation example (nestjs-repository's "Defining a Hook")
  //
  // Reproduces the README's TenantScopeHook verbatim (OverlayRef + ctx.with +
  // Where helpers + { replace: true }), standing lastName in for tenantId
  // since TestEntityFixture has no dedicated tenant column. This is both a
  // type-check of the documented pattern and a behavioral proof of the two
  // scenarios an external evaluation flagged as broken: a cross-tenant read
  // returning nothing, and a caller-smuggled tenant value being overridden
  // on create.
  // ===========================================================================

  describe('README tenant-isolation example', () => {
    const TenantCtx = new OverlayRef<'withTenant', { tenantId: string }>(
      'withTenant',
    );

    @RepoHook()
    class TenantScopeHook {
      @BeforeFind()
      async addTenantFilter(
        options: RepositoryFindOptions<TestEntityFixture>,
        ctx?: AppContextInterface,
      ): Promise<RepositoryFindOptions<TestEntityFixture>> {
        const tenant = ctx?.supports(TenantCtx)
          ? ctx.with(TenantCtx)
          : undefined;
        if (!tenant) return options;

        const condition = Where.eq('lastName', tenant.tenantId);
        return {
          ...options,
          where: options.where
            ? Where.and(options.where, condition)
            : condition,
        };
      }

      @BeforeCreate({ replace: true })
      async stampTenant(
        data: DeepPartial<TestEntityFixture>,
        ctx?: AppContextInterface,
      ): Promise<DeepPartial<TestEntityFixture>> {
        const tenant = ctx?.supports(TenantCtx)
          ? ctx.with(TenantCtx)
          : undefined;
        if (!tenant) return data;

        return { ...data, lastName: tenant.tenantId };
      }
    }

    function tenantCtx(tenantId: string): AppContextHost {
      const ctx = createHookContext(TenantScopeHook);
      ctx.defineOverlay(TenantCtx, { tenantId });
      return ctx;
    }

    it('excludes another tenant’s rows from a scoped read', async () => {
      await moduleFixture.close();

      moduleFixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormConfig),
          CoreModule.forRoot(),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [{ key: TEST_ENTITY_TOKEN, entity: TestEntityFixture }],
          }),
        ],
        providers: [TenantScopeHook],
      }).compile();

      const repo = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
        getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
      );

      const localSeedingSource = new SeedingSource({
        dataSource: moduleFixture.get(getDataSourceToken()),
      });
      await localSeedingSource.initialize();
      const localFactory = new TestFactoryFixture({
        entity: TestEntityFixture,
        seedingSource: localSeedingSource,
      });

      await localFactory.create({
        firstName: 'Orlando Site',
        lastName: 'orlando',
      });
      await localFactory.create({ firstName: 'Tampa Site', lastName: 'tampa' });

      const result = await repo.find({ ctx: tenantCtx('orlando') });

      expect(result.length).toBe(1);
      expect(result[0].lastName).toBe('orlando');
    });

    it('overrides a caller-smuggled tenant value on create', async () => {
      await moduleFixture.close();

      moduleFixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormConfig),
          CoreModule.forRoot(),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [{ key: TEST_ENTITY_TOKEN, entity: TestEntityFixture }],
          }),
        ],
        providers: [TenantScopeHook],
      }).compile();

      const repo = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
        getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
      );

      // Caller (an Orlando-scoped request) tries to smuggle a Tampa tenant id.
      const result = await repo.create(
        { firstName: 'New Site', lastName: 'tampa' },
        { ctx: tenantCtx('orlando') },
      );

      expect(result.lastName).toBe('orlando');
    });
  });

  // ===========================================================================
  // Multiple Hooks Tests
  // ===========================================================================

  describe('multiple hooks on same method', () => {
    it('should call hooks in registration order', async () => {
      // Close the outer beforeEach module so its unnamed DataSource is freed
      // before we register a second one below.
      await moduleFixture.close();

      const callOrder: string[] = [];

      @RepoHook()
      class FirstHook {
        @BeforeFind()
        async beforeFind(options: RepositoryFindOptions<TestEntityFixture>) {
          callOrder.push('first');
          return options;
        }
      }

      @RepoHook()
      class SecondHook {
        @BeforeFind()
        async beforeFind(options: RepositoryFindOptions<TestEntityFixture>) {
          callOrder.push('second');
          return options;
        }
      }

      moduleFixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormConfig),
          CoreModule.forRoot(),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: TEST_ENTITY_TOKEN,
                entity: TestEntityFixture,
              },
            ],
          }),
        ],
        providers: [FirstHook, SecondHook],
      }).compile();

      const repo = moduleFixture.get<TypeOrmRepository<TestEntityFixture>>(
        getDynamicRepositoryToken(TEST_ENTITY_TOKEN),
      );

      await repo.find({
        ctx: createHookContext(FirstHook, SecondHook),
      });

      expect(callOrder).toEqual(['first', 'second']);
    });
  });
});
