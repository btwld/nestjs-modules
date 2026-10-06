import {
  createMockCacheRepository,
  createMockRepositoryResolver,
  createMockCacheEntity,
  toCacheDomain,
  DEFAULT_CACHE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { FindOneCacheQuery } from '../../impl/find-one-cache.query.js';
import { FindOneCacheHandler } from '../find-one-cache.handler.js';

describe(FindOneCacheHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockCacheRepository>;
  let handler: FindOneCacheHandler;

  beforeEach(() => {
    mockRepo = createMockCacheRepository();
    handler = new FindOneCacheHandler(createMockRepositoryResolver(mockRepo));
  });

  it('should return a Cache when found', async () => {
    mockRepo.findOne.mockResolvedValue(toCacheDomain(createMockCacheEntity()));

    const result = await handler.execute(
      new FindOneCacheQuery(
        ctx,
        DEFAULT_CACHE_NAMESPACE,
        'key',
        'type',
        'assignee',
      ),
    );

    expect(result).not.toBeNull();
    expect(result!.id).toBe('test-id');
  });

  it('should return null when not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    const result = await handler.execute(
      new FindOneCacheQuery(
        ctx,
        DEFAULT_CACHE_NAMESPACE,
        'key',
        'type',
        'assignee',
      ),
    );

    expect(result).toBeNull();
  });
});
