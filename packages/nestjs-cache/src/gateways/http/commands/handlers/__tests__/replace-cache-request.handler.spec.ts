import { CrudReplaceCommand } from '@concepta/nestjs-crud';

import {
  createMockCommandBus,
  createMockCacheContext,
  createMockCacheEntity,
  toCacheDomain,
} from '../../../../../__tests__/helpers/mock.helpers.js';
import { ReplaceCacheCommand } from '../../../../../application/commands/impl/replace-cache.command.js';
import { type CacheCreatableInterface } from '../../../../../domain/interfaces/cache-creatable.interface.js';
import { type CacheInterface } from '../../../../../domain/interfaces/cache.interface.js';
import { ReplaceCacheRequestHandler } from '../replace-cache-request.handler.js';

describe(ReplaceCacheRequestHandler.name, () => {
  let commandBus: ReturnType<typeof createMockCommandBus>;
  let handler: ReplaceCacheRequestHandler;

  beforeEach(() => {
    commandBus = createMockCommandBus();
    handler = new ReplaceCacheRequestHandler(commandBus as never);
  });

  it('should return a plain object from toPlain()', async () => {
    commandBus.execute.mockResolvedValue(
      toCacheDomain(createMockCacheEntity({ data: 'replaced-data' })),
    );

    const context = createMockCacheContext({
      entity: 'UserCache',
      params: { id: 'test-id' },
    }) as never;
    const dto: CacheCreatableInterface = {
      key: 'test-key',
      type: 'test-type',
      data: 'replaced-data',
      assigneeId: 'test-assignee',
      expiresIn: '1h',
    };

    const result = await handler.execute(
      new CrudReplaceCommand<CacheInterface, CacheCreatableInterface>(
        context,
        dto,
      ),
    );

    expect(result.data).toBe('replaced-data');
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(ReplaceCacheCommand),
    );
  });

  it('should throw when id is not a string', async () => {
    const context = createMockCacheContext({
      entity: 'UserCache',
      params: { id: undefined },
    }) as never;
    const dto: CacheCreatableInterface = {
      key: 'k',
      type: 't',
      data: 'd',
      assigneeId: 'a',
      expiresIn: null,
    };

    await expect(
      handler.execute(
        new CrudReplaceCommand<CacheInterface, CacheCreatableInterface>(
          context,
          dto,
        ),
      ),
    ).rejects.toThrow();
  });
});
