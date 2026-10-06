import {
  createMockCacheRepository,
  createMockRepositoryResolver,
  createMockTransaction,
  createMockCacheEntity,
  toCacheDomain,
  DEFAULT_CACHE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { Cache } from '../../../../domain/aggregates/cache.js';
import { RemoveCacheCommand } from '../../impl/remove-cache.command.js';
import { RemoveCacheHandler } from '../remove-cache.handler.js';

describe(RemoveCacheHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockCacheRepository>;
  let handler: RemoveCacheHandler;

  beforeEach(() => {
    mockRepo = createMockCacheRepository();
    const { transaction } = createMockTransaction();

    handler = new RemoveCacheHandler(
      createMockRepositoryResolver(mockRepo),
      transaction as never,
    );
  });

  it('should return the removed Cache', async () => {
    mockRepo.get.mockResolvedValue(toCacheDomain(createMockCacheEntity()));

    const result = await handler.execute(
      new RemoveCacheCommand(ctx, DEFAULT_CACHE_NAMESPACE, 'test-id'),
    );

    expect(result).toBeInstanceOf(Cache);
    expect(result.id).toBe('test-id');
  });

  it('should call remove on the repository', async () => {
    mockRepo.get.mockResolvedValue(toCacheDomain(createMockCacheEntity()));

    await handler.execute(
      new RemoveCacheCommand(ctx, DEFAULT_CACHE_NAMESPACE, 'test-id'),
    );

    expect(mockRepo.remove).toHaveBeenCalledTimes(1);
  });
});
