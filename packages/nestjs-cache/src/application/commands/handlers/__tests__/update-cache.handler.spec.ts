import {
  createMockCacheRepository,
  createMockRepositoryResolver,
  createMockTransaction,
  createMockEventPublisher,
  createMockCacheEntity,
  toCacheDomain,
  DEFAULT_CACHE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { Cache } from '../../../../domain/aggregates/cache.js';
import { CacheExpirationPolicy } from '../../../../domain/policies/cache-expiration.policy.js';
import { UpdateCacheCommand } from '../../impl/update-cache.command.js';
import { UpdateCacheHandler } from '../update-cache.handler.js';

describe(UpdateCacheHandler.name, () => {
  const ctx = {};
  const policy = new CacheExpirationPolicy({ expiresIn: '1h' });
  let mockRepo: ReturnType<typeof createMockCacheRepository>;
  let handler: UpdateCacheHandler;

  beforeEach(() => {
    mockRepo = createMockCacheRepository();
    const { transaction } = createMockTransaction();

    handler = new UpdateCacheHandler(
      createMockRepositoryResolver(mockRepo),
      transaction as never,
      createMockEventPublisher() as never,
      policy,
    );
  });

  it('should return the updated Cache', async () => {
    mockRepo.get.mockResolvedValue(toCacheDomain(createMockCacheEntity()));

    const dto = {
      key: 'test-key',
      type: 'test-type',
      data: 'new-data',
      assigneeId: 'test-assignee',
      expiresIn: '2h',
    };

    const result = await handler.execute(
      new UpdateCacheCommand(ctx, DEFAULT_CACHE_NAMESPACE, 'test-id', dto),
    );

    expect(result).toBeInstanceOf(Cache);
    expect(result.data).toBe('new-data');
  });

  it('should save the cache', async () => {
    mockRepo.get.mockResolvedValue(toCacheDomain(createMockCacheEntity()));

    const dto = {
      key: 'test-key',
      type: 'test-type',
      data: 'new-data',
      assigneeId: 'test-assignee',
      expiresIn: null,
    };

    await handler.execute(
      new UpdateCacheCommand(ctx, DEFAULT_CACHE_NAMESPACE, 'test-id', dto),
    );

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });
});
