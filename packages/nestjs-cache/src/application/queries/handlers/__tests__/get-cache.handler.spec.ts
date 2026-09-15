import {
  createMockCacheRepository,
  createMockRepositoryResolver,
  createMockCacheEntity,
  toCacheDomain,
  DEFAULT_CACHE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { Cache } from '../../../../domain/aggregates/cache.js';
import { GetCacheQuery } from '../../impl/get-cache.query.js';
import { GetCacheHandler } from '../get-cache.handler.js';

describe(GetCacheHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockCacheRepository>;
  let handler: GetCacheHandler;

  beforeEach(() => {
    mockRepo = createMockCacheRepository();
    handler = new GetCacheHandler(createMockRepositoryResolver(mockRepo));
  });

  it('should return a Cache for a valid id', async () => {
    const entity = createMockCacheEntity();
    mockRepo.get.mockResolvedValue(toCacheDomain(entity));

    const result = await handler.execute(
      new GetCacheQuery(ctx, DEFAULT_CACHE_NAMESPACE, 'test-id'),
    );

    expect(result).toBeInstanceOf(Cache);
    expect(result.id).toBe('test-id');
  });
});
