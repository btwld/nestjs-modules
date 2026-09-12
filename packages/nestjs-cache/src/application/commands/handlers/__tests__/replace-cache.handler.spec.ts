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
import { ReplaceCacheCommand } from '../../impl/replace-cache.command.js';
import { ReplaceCacheHandler } from '../replace-cache.handler.js';

describe(ReplaceCacheHandler.name, () => {
  const ctx = {};
  const policy = new CacheExpirationPolicy({ expiresIn: '1h' });
  let mockRepo: ReturnType<typeof createMockCacheRepository>;
  let handler: ReplaceCacheHandler;

  beforeEach(() => {
    mockRepo = createMockCacheRepository();
    const { transaction } = createMockTransaction();

    handler = new ReplaceCacheHandler(
      createMockRepositoryResolver(mockRepo),
      transaction as never,
      createMockEventPublisher() as never,
      policy,
    );
  });

  const dto = {
    key: 'test-key',
    type: 'test-type',
    data: 'replaced-data',
    assigneeId: 'test-assignee',
    expiresIn: '1h',
  };

  it('should replace an existing cache', async () => {
    mockRepo.get.mockResolvedValue(toCacheDomain(createMockCacheEntity()));

    const result = await handler.execute(
      new ReplaceCacheCommand(ctx, DEFAULT_CACHE_NAMESPACE, 'test-id', dto),
    );

    expect(result).toBeInstanceOf(Cache);
    expect(result.data).toBe('replaced-data');
  });

  it('should create a new cache when not found', async () => {
    mockRepo.get.mockResolvedValue(null);

    const result = await handler.execute(
      new ReplaceCacheCommand(ctx, DEFAULT_CACHE_NAMESPACE, 'new-id', dto),
    );

    expect(result).toBeInstanceOf(Cache);
    expect(result.id).toBe('new-id');
  });

  it('should save in both paths', async () => {
    mockRepo.get.mockResolvedValue(null);

    await handler.execute(
      new ReplaceCacheCommand(ctx, DEFAULT_CACHE_NAMESPACE, 'new-id', dto),
    );

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });
});
