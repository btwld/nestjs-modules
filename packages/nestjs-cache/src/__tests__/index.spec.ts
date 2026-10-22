import {
  CacheModule,
  Cache,
  CacheRepository,
  CacheRepositoryResolver,
  cacheCreateSchema,
  UpsertCacheCommand,
  ClearCachesByAssigneeCommand,
  CreateCacheCommand,
  UpdateCacheCommand,
  RemoveCacheCommand,
  ReplaceCacheCommand,
  ArchiveCacheCommand,
  GetCacheQuery,
  FindOneCacheQuery,
  FindCachesByAssigneeQuery,
  UpsertCacheHandler,
  ClearCachesByAssigneeHandler,
  CreateCacheHandler,
  UpdateCacheHandler,
  RemoveCacheHandler,
  ReplaceCacheHandler,
  ArchiveCacheHandler,
  GetCacheHandler,
  FindOneCacheHandler,
  FindCachesByAssigneeHandler,
} from '../index.js';

describe('index', () => {
  it('should export CacheModule', () => {
    expect(CacheModule).toBeInstanceOf(Function);
  });

  it('should export Cache domain object', () => {
    expect(Cache).toBeInstanceOf(Function);
  });

  it('should export CacheRepository', () => {
    expect(CacheRepository).toBeInstanceOf(Function);
  });

  it('should export CacheRepositoryResolver', () => {
    expect(CacheRepositoryResolver).toBeInstanceOf(Function);
  });

  it('should export cacheCreateSchema', () => {
    expect(cacheCreateSchema.meta).toBeInstanceOf(Function);
  });

  it('should export domain commands', () => {
    expect(UpsertCacheCommand).toBeInstanceOf(Function);
    expect(ClearCachesByAssigneeCommand).toBeInstanceOf(Function);
    expect(CreateCacheCommand).toBeInstanceOf(Function);
    expect(UpdateCacheCommand).toBeInstanceOf(Function);
    expect(RemoveCacheCommand).toBeInstanceOf(Function);
    expect(ReplaceCacheCommand).toBeInstanceOf(Function);
    expect(ArchiveCacheCommand).toBeInstanceOf(Function);
  });

  it('should export domain queries', () => {
    expect(GetCacheQuery).toBeInstanceOf(Function);
    expect(FindOneCacheQuery).toBeInstanceOf(Function);
    expect(FindCachesByAssigneeQuery).toBeInstanceOf(Function);
  });

  it('should export domain handlers', () => {
    expect(UpsertCacheHandler).toBeInstanceOf(Function);
    expect(ClearCachesByAssigneeHandler).toBeInstanceOf(Function);
    expect(CreateCacheHandler).toBeInstanceOf(Function);
    expect(UpdateCacheHandler).toBeInstanceOf(Function);
    expect(RemoveCacheHandler).toBeInstanceOf(Function);
    expect(ReplaceCacheHandler).toBeInstanceOf(Function);
    expect(ArchiveCacheHandler).toBeInstanceOf(Function);
    expect(GetCacheHandler).toBeInstanceOf(Function);
    expect(FindOneCacheHandler).toBeInstanceOf(Function);
    expect(FindCachesByAssigneeHandler).toBeInstanceOf(Function);
  });
});
