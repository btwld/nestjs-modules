import {
  createMockCacheRepository,
  createMockRepositoryResolver,
  createMockCacheEntity,
  toCacheDomain,
  DEFAULT_CACHE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { FindCachesByAssigneeQuery } from '../../impl/find-caches-by-assignee.query.js';
import { FindCachesByAssigneeHandler } from '../find-caches-by-assignee.handler.js';

describe(FindCachesByAssigneeHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockCacheRepository>;
  let handler: FindCachesByAssigneeHandler;

  beforeEach(() => {
    mockRepo = createMockCacheRepository();
    handler = new FindCachesByAssigneeHandler(
      createMockRepositoryResolver(mockRepo),
    );
  });

  it('should return an array of caches', async () => {
    const entity = createMockCacheEntity();
    mockRepo.findAllByAssignee.mockResolvedValue([
      toCacheDomain(entity),
      toCacheDomain({ ...entity, id: 'id-2' }),
    ]);

    const result = await handler.execute(
      new FindCachesByAssigneeQuery(
        ctx,
        DEFAULT_CACHE_NAMESPACE,
        'test-assignee',
      ),
    );

    expect(result).toHaveLength(2);
  });

  it('should return empty array when no matches', async () => {
    mockRepo.findAllByAssignee.mockResolvedValue([]);

    const result = await handler.execute(
      new FindCachesByAssigneeQuery(ctx, DEFAULT_CACHE_NAMESPACE, 'no-match'),
    );

    expect(result).toEqual([]);
  });
});
