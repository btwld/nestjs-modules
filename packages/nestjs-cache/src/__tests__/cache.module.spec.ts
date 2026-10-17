import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { CACHE_REPOSITORY_RESOLVER_TOKEN } from '../cache.constants.js';
import { CacheModule } from '../cache.module.js';
import { type CacheRepositoryResolverInterface } from '../domain/repositories/cache-repository-resolver.interface.js';
import { CacheRepository } from '../infrastructure/persistence/cache.repository.js';

import { AppModuleFixture } from './fixtures/app.module.fixture.js';
import { UserCacheEntityFixture } from './fixtures/entities/user-cache-entity.fixture.js';
import { UserEntityFixture } from './fixtures/entities/user-entity.fixture.js';

describe(CacheModule.name, () => {
  let cacheModule: CacheModule;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    cacheModule = testModule.get<CacheModule>(CacheModule);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('module', () => {
    it('should be loaded', async () => {
      expect(cacheModule).toBeInstanceOf(CacheModule);
    });
  });

  describe('register', () => {
    it('should return a dynamic module', () => {
      const result = CacheModule.register({});
      expect(result.module).toBe(CacheModule);
      expect(result.imports).toHaveLength(1);
    });
  });

  describe('registerAsync', () => {
    it('should return a dynamic module', () => {
      const result = CacheModule.registerAsync({});
      expect(result.module).toBe(CacheModule);
      expect(result.imports).toHaveLength(1);
    });
  });

  describe('forRoot', () => {
    it('should return a global dynamic module', () => {
      const result = CacheModule.forRoot({});
      expect(result.module).toBe(CacheModule);
      expect(result.imports).toHaveLength(1);
    });
  });

  describe('forRootAsync', () => {
    it('should return a global dynamic module', () => {
      const result = CacheModule.forRootAsync({});
      expect(result.module).toBe(CacheModule);
      expect(result.imports).toHaveLength(1);
    });
  });

  describe('forFeature', () => {
    it('should return providers for each entity key', () => {
      const result = CacheModule.forFeature(['userCache', 'sessionCache']);
      expect(result.module).toBe(CacheModule);
      expect(result.providers).toHaveLength(2);
      expect(result.exports).toHaveLength(2);
    });

    it('should resolve CacheRepository via CacheRepositoryResolver', async () => {
      const testModule: TestingModule = await Test.createTestingModule({
        imports: [AppModuleFixture],
      }).compile();

      const resolver = testModule.get<CacheRepositoryResolverInterface>(
        CACHE_REPOSITORY_RESOLVER_TOKEN,
      );
      const repo = resolver.resolve('userCache');

      expect(repo).toBeInstanceOf(CacheRepository);
    });

    it('should build repositories.cache for each forFeature key', async () => {
      class CustomCacheRepository extends CacheRepository {}

      const testModule: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: 'better-sqlite3',
            database: ':memory:',
            synchronize: true,
            entities: [UserEntityFixture, UserCacheEntityFixture],
          }),
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: TypeOrmRepositoryModule,
                entities: [
                  { key: 'userCache', entity: UserCacheEntityFixture },
                ],
              },
            ],
          }),
          CacheModule.forRoot({
            repositories: { cache: CustomCacheRepository },
          }),
          CacheModule.forFeature(['userCache']),
        ],
      }).compile();

      const resolver = testModule.get<CacheRepositoryResolverInterface>(
        CACHE_REPOSITORY_RESOLVER_TOKEN,
      );

      expect(resolver.resolve('userCache')).toBeInstanceOf(
        CustomCacheRepository,
      );
    });
  });
});
