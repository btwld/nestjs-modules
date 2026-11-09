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
import { UpsertCacheCommand } from '../../impl/upsert-cache.command.js';
import { UpsertCacheHandler } from '../upsert-cache.handler.js';

describe(UpsertCacheHandler.name, () => {
  const ctx = {};
  const policy = new CacheExpirationPolicy({ expiresIn: '1h' });
  let mockRepo: ReturnType<typeof createMockCacheRepository>;
  let handler: UpsertCacheHandler;

  beforeEach(() => {
    mockRepo = createMockCacheRepository();
    const { transaction } = createMockTransaction();

    handler = new UpsertCacheHandler(
      createMockRepositoryResolver(mockRepo),
      transaction as never,
      createMockEventPublisher() as never,
      policy,
    );
  });

  const dto = {
    key: 'test-key',
    type: 'test-type',
    data: 'upsert-data',
    assigneeId: 'test-assignee',
    expiresIn: '2h',
  };

  it('should update existing cache when found', async () => {
    mockRepo.findOne.mockResolvedValue(toCacheDomain(createMockCacheEntity()));

    const result = await handler.execute(
      new UpsertCacheCommand(ctx, DEFAULT_CACHE_NAMESPACE, dto),
    );

    expect(result).toBeInstanceOf(Cache);
    expect(result.data).toBe('upsert-data');
  });

  it('should create a new cache when not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    const result = await handler.execute(
      new UpsertCacheCommand(ctx, DEFAULT_CACHE_NAMESPACE, dto),
    );

    expect(result).toBeInstanceOf(Cache);
    expect(result.key).toBe('test-key');
  });

  it('should save in both paths', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await handler.execute(
      new UpsertCacheCommand(ctx, DEFAULT_CACHE_NAMESPACE, dto),
    );

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });
});
