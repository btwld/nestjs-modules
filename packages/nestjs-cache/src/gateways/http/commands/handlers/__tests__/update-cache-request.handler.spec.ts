import { CrudUpdateCommand } from '@concepta/nestjs-crud';

import {
  createMockCommandBus,
  createMockCacheContext,
  createMockCacheEntity,
  toCacheDomain,
} from '../../../../../__tests__/helpers/mock.helpers.js';
import { UpdateCacheCommand } from '../../../../../application/commands/impl/update-cache.command.js';
import { type CacheUpdatableInterface } from '../../../../../domain/interfaces/cache-updatable.interface.js';
import { type CacheInterface } from '../../../../../domain/interfaces/cache.interface.js';
import { UpdateCacheRequestHandler } from '../update-cache-request.handler.js';

describe(UpdateCacheRequestHandler.name, () => {
  let commandBus: ReturnType<typeof createMockCommandBus>;
  let handler: UpdateCacheRequestHandler;

  beforeEach(() => {
    commandBus = createMockCommandBus();
    handler = new UpdateCacheRequestHandler(commandBus as never);
  });

  it('should return a plain object from toPlain()', async () => {
    commandBus.execute.mockResolvedValue(
      toCacheDomain(createMockCacheEntity({ data: 'updated-data' })),
    );

    const context = createMockCacheContext({
      entity: 'UserCache',
      params: { id: 'test-id' },
    }) as never;
    const dto: CacheUpdatableInterface = {
      data: 'updated-data',
      expiresIn: null,
    };

    const result = await handler.execute(
      new CrudUpdateCommand<CacheInterface, CacheUpdatableInterface>(
        context,
        dto,
      ),
    );

    expect(result.data).toBe('updated-data');
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(UpdateCacheCommand),
    );
  });

  it('should throw when id is not a string', async () => {
    const context = createMockCacheContext({
      entity: 'UserCache',
      params: { id: 123 },
    }) as never;
    const dto: CacheUpdatableInterface = {
      data: 'd',
      expiresIn: null,
    };

    await expect(
      handler.execute(
        new CrudUpdateCommand<CacheInterface, CacheUpdatableInterface>(
          context,
          dto,
        ),
      ),
    ).rejects.toThrow();
  });
});
