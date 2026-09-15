import { type DataSource, type Repository } from 'typeorm';
import { mockDeep } from 'vitest-mock-extended';

import { getDataSourceToken } from '@nestjs/typeorm';

import { HookResolverService } from '@concepta/nestjs-core';
import { getDynamicRepositoryToken } from '@concepta/nestjs-repository';

import { type TypeOrmProviderOptionsInterface } from '../repository/typeorm-provider-options.interface.js';
import { TypeOrmRepository } from '../repository/typeorm-repository.js';
import { TypeOrmTransactionFactory } from '../transaction/typeorm-transaction.factory.js';
import { TYPEORM_DEFAULT_DATA_SOURCE_NAME } from '../typeorm-repository.constants.js';
import {
  resolveDataSourceName,
  resolveTransactionKey,
  resolveTokenName,
  createTypeOrmRepository,
  createTypeOrmProvider,
  getTypeOrmImports,
  createTransactionFactoryDescriptor,
  OPTIONAL_HOOK_RESOLVER_INJECT,
} from '../typeorm-repository.util.js';

// Mock entity class for testing
class TestEntity {
  id!: string;
  name!: string;
}

describe('typeorm-repository.util', () => {
  describe('resolveDataSourceName', () => {
    it('should return default name when no dataSource provided', () => {
      const result = resolveDataSourceName();
      expect(result).toBe(TYPEORM_DEFAULT_DATA_SOURCE_NAME);
    });

    it('should return default name when dataSource is undefined', () => {
      const result = resolveDataSourceName(undefined);
      expect(result).toBe(TYPEORM_DEFAULT_DATA_SOURCE_NAME);
    });

    it('should return string dataSource as-is', () => {
      const result = resolveDataSourceName('secondary');
      expect(result).toBe('secondary');
    });

    it('should return DataSource name when DataSource object provided', () => {
      const mockDataSource = { name: 'custom-ds' } as DataSource;
      const result = resolveDataSourceName(mockDataSource);
      expect(result).toBe('custom-ds');
    });

    it('should return default name when DataSource has no name', () => {
      const mockDataSource = {} as DataSource;
      const result = resolveDataSourceName(mockDataSource);
      expect(result).toBe(TYPEORM_DEFAULT_DATA_SOURCE_NAME);
    });
  });

  describe('resolveTransactionKey', () => {
    it('should return typeorm:default for no dataSource', () => {
      const result = resolveTransactionKey();
      expect(result).toBe(`typeorm:${TYPEORM_DEFAULT_DATA_SOURCE_NAME}`);
    });

    it('should return typeorm:<name> for named dataSource', () => {
      const result = resolveTransactionKey('secondary');
      expect(result).toBe('typeorm:secondary');
    });

    it('should handle DataSource object', () => {
      const mockDataSource = { name: 'custom-ds' } as DataSource;
      const result = resolveTransactionKey(mockDataSource);
      expect(result).toBe('typeorm:custom-ds');
    });
  });

  describe('resolveTokenName', () => {
    it('should return undefined for default data source name', () => {
      const result = resolveTokenName(TYPEORM_DEFAULT_DATA_SOURCE_NAME);
      expect(result).toBeUndefined();
    });

    it('should return the name for non-default data source', () => {
      const result = resolveTokenName('secondary');
      expect(result).toBe('secondary');
    });

    it('should return undefined for undefined input', () => {
      const result = resolveTokenName(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('createTypeOrmRepository', () => {
    it('should create TypeOrmRepository with default transaction key', () => {
      const mockRepo = {
        target: TestEntity,
        metadata: { name: 'TestEntity', targetName: 'TestEntity', columns: [] },
      } as unknown as Repository<TestEntity>;

      const result = createTypeOrmRepository(mockRepo, 'test-entity');

      expect(result).toBeInstanceOf(TypeOrmRepository);
      expect(result.metadata.type).toBe(TestEntity);
    });

    it('should create TypeOrmRepository with custom data source', () => {
      const mockRepo = {
        target: TestEntity,
        metadata: { name: 'TestEntity', targetName: 'TestEntity', columns: [] },
      } as unknown as Repository<TestEntity>;

      const result = createTypeOrmRepository(
        mockRepo,
        'test-entity',
        'secondary',
      );

      expect(result).toBeInstanceOf(TypeOrmRepository);
    });

    it('should create TypeOrmRepository with hookResolver', () => {
      const mockRepo = {
        target: TestEntity,
        metadata: { name: 'TestEntity', targetName: 'TestEntity', columns: [] },
      } as unknown as Repository<TestEntity>;
      const mockHookResolver = {} as HookResolverService;

      const result = createTypeOrmRepository(
        mockRepo,
        'test-entity',
        undefined,
        mockHookResolver,
      );

      expect(result).toBeInstanceOf(TypeOrmRepository);
    });
  });

  describe('OPTIONAL_HOOK_RESOLVER_INJECT', () => {
    it('should have correct token and optional flag', () => {
      expect(OPTIONAL_HOOK_RESOLVER_INJECT.token).toBe(HookResolverService);
      expect(OPTIONAL_HOOK_RESOLVER_INJECT.optional).toBe(true);
    });
  });

  describe('createTypeOrmProvider', () => {
    it('should create provider for standard entity', () => {
      const options: TypeOrmProviderOptionsInterface = {
        key: 'test-entity',
        entity: TestEntity,
      };

      const provider = createTypeOrmProvider(options);

      expect(provider).toHaveProperty('provide');
      expect(provider).toHaveProperty('inject');
      expect(provider).toHaveProperty('useFactory');
      // Provider uses public token directly
      expect((provider as { provide: string }).provide).toBe(
        getDynamicRepositoryToken('test-entity'),
      );
    });

    it('should create provider with custom data source', () => {
      const options: TypeOrmProviderOptionsInterface = {
        key: 'test-entity',
        entity: TestEntity,
        dataSource: 'secondary',
      };

      const provider = createTypeOrmProvider(options);

      expect(provider).toHaveProperty('provide');
      expect((provider as { inject: unknown[] }).inject).toBeDefined();
    });

    it('should create provider with factory function', () => {
      const mockFactory = vi.fn();
      const options: TypeOrmProviderOptionsInterface = {
        key: 'test-entity',
        entity: TestEntity,
        factory: mockFactory,
      };

      const provider = createTypeOrmProvider(options);

      expect(provider).toHaveProperty('provide');
      expect(provider).toHaveProperty('useFactory');
    });

    it('factory provider should use DataSource token for injection', () => {
      const mockFactory = vi.fn();
      const options: TypeOrmProviderOptionsInterface = {
        key: 'test-entity',
        entity: TestEntity,
        factory: mockFactory,
      };

      const provider = createTypeOrmProvider(options);
      const inject = (provider as { inject: unknown[] }).inject;

      // When using factory, should inject DataSource
      expect(inject).toContain(getDataSourceToken());
    });

    it('standard provider should inject optional HookResolverService', () => {
      const options: TypeOrmProviderOptionsInterface = {
        key: 'test-entity',
        entity: TestEntity,
      };

      const provider = createTypeOrmProvider(options);
      const inject = (provider as { inject: unknown[] }).inject;

      expect(inject).toContainEqual(OPTIONAL_HOOK_RESOLVER_INJECT);
    });

    it('factory provider should inject optional HookResolverService', () => {
      const mockFactory = vi.fn();
      const options: TypeOrmProviderOptionsInterface = {
        key: 'test-entity',
        entity: TestEntity,
        factory: mockFactory,
      };

      const provider = createTypeOrmProvider(options);
      const inject = (provider as { inject: unknown[] }).inject;

      expect(inject).toContainEqual(OPTIONAL_HOOK_RESOLVER_INJECT);
    });

    it('factory useFactory should call custom factory and wrap result', () => {
      const mockRepo = {
        target: TestEntity,
        metadata: { name: 'TestEntity', targetName: 'TestEntity', columns: [] },
      } as unknown as Repository<TestEntity>;
      const mockFactory = vi.fn().mockReturnValue(mockRepo);

      const options: TypeOrmProviderOptionsInterface = {
        key: 'test-entity',
        entity: TestEntity,
        factory: mockFactory,
      };

      const provider = createTypeOrmProvider(options);
      const useFactory = (
        provider as { useFactory: (ds: DataSource) => unknown }
      ).useFactory;
      const mockDataSource = {} as DataSource;

      const result = useFactory(mockDataSource);

      expect(mockFactory).toHaveBeenCalledWith(mockDataSource);
      expect(result).toBeInstanceOf(TypeOrmRepository);
    });

    it('standard useFactory should create repository with hookResolver', () => {
      const options: TypeOrmProviderOptionsInterface = {
        key: 'test-entity',
        entity: TestEntity,
      };

      const provider = createTypeOrmProvider(options);
      const useFactory = (
        provider as {
          useFactory: (
            repo: Repository<TestEntity>,
            hookResolver?: HookResolverService,
          ) => unknown;
        }
      ).useFactory;

      const mockRepo = {
        target: TestEntity,
        metadata: { name: 'TestEntity', targetName: 'TestEntity', columns: [] },
      } as unknown as Repository<TestEntity>;
      const mockHookResolver = {} as HookResolverService;

      const result = useFactory(mockRepo, mockHookResolver);

      expect(result).toBeInstanceOf(TypeOrmRepository);
    });

    it('standard useFactory should work without hookResolver', () => {
      const options: TypeOrmProviderOptionsInterface = {
        key: 'test-entity',
        entity: TestEntity,
      };

      const provider = createTypeOrmProvider(options);
      const useFactory = (
        provider as {
          useFactory: (
            repo: Repository<TestEntity>,
            hookResolver?: HookResolverService,
          ) => unknown;
        }
      ).useFactory;

      const mockRepo = {
        target: TestEntity,
        metadata: { name: 'TestEntity', targetName: 'TestEntity', columns: [] },
      } as unknown as Repository<TestEntity>;

      const result = useFactory(mockRepo, undefined);

      expect(result).toBeInstanceOf(TypeOrmRepository);
    });

    it('factory useFactory should pass hookResolver to repository', () => {
      const mockRepo = {
        target: TestEntity,
        metadata: { name: 'TestEntity', targetName: 'TestEntity', columns: [] },
      } as unknown as Repository<TestEntity>;
      const mockFactory = vi.fn().mockReturnValue(mockRepo);

      const options: TypeOrmProviderOptionsInterface = {
        key: 'test-entity',
        entity: TestEntity,
        factory: mockFactory,
      };

      const provider = createTypeOrmProvider(options);
      const useFactory = (
        provider as {
          useFactory: (
            ds: DataSource,
            hookResolver?: HookResolverService,
          ) => unknown;
        }
      ).useFactory;
      const mockDataSource = {} as DataSource;
      const mockHookResolver = {} as HookResolverService;

      const result = useFactory(mockDataSource, mockHookResolver);

      expect(result).toBeInstanceOf(TypeOrmRepository);
    });

    it('factory useFactory should work without hookResolver', () => {
      const mockRepo = {
        target: TestEntity,
        metadata: { name: 'TestEntity', targetName: 'TestEntity', columns: [] },
      } as unknown as Repository<TestEntity>;
      const mockFactory = vi.fn().mockReturnValue(mockRepo);

      const options: TypeOrmProviderOptionsInterface = {
        key: 'test-entity',
        entity: TestEntity,
        factory: mockFactory,
      };

      const provider = createTypeOrmProvider(options);
      const useFactory = (
        provider as {
          useFactory: (
            ds: DataSource,
            hookResolver?: HookResolverService,
          ) => unknown;
        }
      ).useFactory;
      const mockDataSource = {} as DataSource;

      const result = useFactory(mockDataSource, undefined);

      expect(result).toBeInstanceOf(TypeOrmRepository);
    });
  });

  describe('getTypeOrmImports', () => {
    it('should return TypeOrmModule.forFeature for default data source', () => {
      const entities: TypeOrmProviderOptionsInterface[] = [
        { key: 'test', entity: TestEntity },
      ];

      const imports = getTypeOrmImports(entities);

      expect(imports).toHaveLength(1);
      expect(imports[0]).toHaveProperty('module');
    });

    it('should group entities by data source', () => {
      class Entity1 {
        id!: string;
      }
      class Entity2 {
        id!: string;
      }
      class Entity3 {
        id!: string;
      }

      const entities: TypeOrmProviderOptionsInterface[] = [
        { key: 'e1', entity: Entity1 },
        { key: 'e2', entity: Entity2, dataSource: 'secondary' },
        { key: 'e3', entity: Entity3 },
      ];

      const imports = getTypeOrmImports(entities);

      // Should have 2 imports: one for default, one for secondary
      expect(imports).toHaveLength(2);
    });

    it('should return empty array for empty entities', () => {
      const imports = getTypeOrmImports([]);
      expect(imports).toHaveLength(0);
    });
  });

  describe('createTransactionFactoryDescriptor', () => {
    it('should create descriptor for default data source', () => {
      const descriptor = createTransactionFactoryDescriptor();

      expect(descriptor.key).toBe(
        `typeorm:${TYPEORM_DEFAULT_DATA_SOURCE_NAME}`,
      );
      expect(descriptor.inject).toContain(getDataSourceToken());
      expect(descriptor.useFactory).toBeInstanceOf(Function);
    });

    it('should create descriptor for named data source', () => {
      const descriptor = createTransactionFactoryDescriptor('secondary');

      expect(descriptor.key).toBe('typeorm:secondary');
      expect(descriptor.inject).toContain(getDataSourceToken('secondary'));
    });

    it('useFactory should return TypeOrmTransactionFactory', () => {
      const descriptor = createTransactionFactoryDescriptor();
      const mockDataSource = mockDeep<DataSource>();

      const factory = descriptor.useFactory(mockDataSource);

      expect(factory).toBeInstanceOf(TypeOrmTransactionFactory);
    });
  });
});
