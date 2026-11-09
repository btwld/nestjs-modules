import {
  cachePaginatedSchema,
  CreateCacheRequest,
  UpdateCacheRequest,
  DeleteCacheRequest,
  ReplaceCacheRequest,
  ListCachesRequest,
  ReadCacheRequest,
  CreateCacheRequestHandler,
  UpdateCacheRequestHandler,
  DeleteCacheRequestHandler,
  ReplaceCacheRequestHandler,
  ListCachesRequestHandler,
  ReadCacheRequestHandler,
} from '../optional-crud.js';

describe('optional-crud', () => {
  it('should export cachePaginatedSchema', () => {
    expect(cachePaginatedSchema.meta).toBeInstanceOf(Function);
  });

  it('should export requests', () => {
    expect(CreateCacheRequest).toBeInstanceOf(Function);
    expect(UpdateCacheRequest).toBeInstanceOf(Function);
    expect(DeleteCacheRequest).toBeInstanceOf(Function);
    expect(ReplaceCacheRequest).toBeInstanceOf(Function);
    expect(ListCachesRequest).toBeInstanceOf(Function);
    expect(ReadCacheRequest).toBeInstanceOf(Function);
  });

  it('should export request handlers', () => {
    expect(CreateCacheRequestHandler).toBeInstanceOf(Function);
    expect(UpdateCacheRequestHandler).toBeInstanceOf(Function);
    expect(DeleteCacheRequestHandler).toBeInstanceOf(Function);
    expect(ReplaceCacheRequestHandler).toBeInstanceOf(Function);
    expect(ListCachesRequestHandler).toBeInstanceOf(Function);
    expect(ReadCacheRequestHandler).toBeInstanceOf(Function);
  });
});
