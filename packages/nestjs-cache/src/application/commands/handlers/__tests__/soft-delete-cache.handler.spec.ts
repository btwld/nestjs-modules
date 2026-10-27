import {
  createMockCacheRepository,
  createMockRepositoryResolver,
  createMockTransaction,
  createMockCacheEntity,
  toCacheDomain,
  DEFAULT_CACHE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { Cache } from '../../../../domain/aggregates/cache.js';
import { SoftDeleteCacheCommand } from '../../impl/soft-delete-cache.command.js';
import { SoftDeleteCacheHandler } from '../soft-delete-cache.handler.js';

describe(SoftDeleteCacheHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockCacheRepository>;
  let handler: SoftDeleteCacheHandler;

  beforeEach(() => {
    mockRepo = createMockCacheRepository();
    const { transaction } = createMockTransaction();

    handler = new SoftDeleteCacheHandler(
      createMockRepositoryResolver(mockRepo),
      transaction as never,
    );
  });

  it('should return the soft-deleted Cache', async () => {
    mockRepo.get.mockResolvedValue(toCacheDomain(createMockCacheEntity()));

    const result = await handler.execute(
      new SoftDeleteCacheCommand(ctx, DEFAULT_CACHE_NAMESPACE, 'test-id'),
    );

    expect(result).toBeInstanceOf(Cache);
    expect(result.id).toBe('test-id');
  });

  it('should call softDelete on the repository', async () => {
    mockRepo.get.mockResolvedValue(toCacheDomain(createMockCacheEntity()));

    await handler.execute(
      new SoftDeleteCacheCommand(ctx, DEFAULT_CACHE_NAMESPACE, 'test-id'),
    );

    expect(mockRepo.softDelete).toHaveBeenCalledTimes(1);
  });
});
