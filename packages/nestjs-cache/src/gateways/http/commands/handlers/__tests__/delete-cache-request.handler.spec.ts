import { Operation } from '@concepta/nestjs-core';
import { CrudDeleteCommand } from '@concepta/nestjs-crud';

import {
  createMockCommandBus,
  createMockCacheContext,
  createMockCacheEntity,
  toCacheDomain,
} from '../../../../../__tests__/helpers/mock.helpers.js';
import { type CacheInterface } from '../../../../../domain/interfaces/cache.interface.js';
import { DeleteCacheRequestHandler } from '../delete-cache-request.handler.js';

describe(DeleteCacheRequestHandler.name, () => {
  let commandBus: ReturnType<typeof createMockCommandBus>;
  let handler: DeleteCacheRequestHandler;

  beforeEach(() => {
    commandBus = createMockCommandBus();
    handler = new DeleteCacheRequestHandler(commandBus as never);
  });

  it('should return null when returnDeleted is false', async () => {
    commandBus.execute.mockResolvedValue(
      toCacheDomain(createMockCacheEntity()),
    );

    const context = createMockCacheContext({
      entity: 'UserCache',
      params: { id: 'test-id' },
      operation: Operation.Delete,
      options: { route: { returnDeleted: false } },
    }) as never;

    const result = await handler.execute(
      new CrudDeleteCommand<CacheInterface>(context),
    );

    expect(result).toBeNull();
  });

  it('should return plain object when returnDeleted is true', async () => {
    commandBus.execute.mockResolvedValue(
      toCacheDomain(createMockCacheEntity()),
    );

    const context = createMockCacheContext({
      entity: 'UserCache',
      params: { id: 'test-id' },
      operation: Operation.Delete,
      options: { route: { returnDeleted: true } },
    }) as never;

    const result = await handler.execute(
      new CrudDeleteCommand<CacheInterface>(context),
    );

    expect(result).not.toBeNull();
    expect(result!.id).toBe('test-id');
  });

  it('should use soft delete when operation is SoftDelete', async () => {
    commandBus.execute.mockResolvedValue(
      toCacheDomain(createMockCacheEntity()),
    );

    const context = createMockCacheContext({
      entity: 'UserCache',
      params: { id: 'test-id' },
      operation: Operation.SoftDelete,
      options: { route: { returnDeleted: false } },
    }) as never;

    await handler.execute(new CrudDeleteCommand<CacheInterface>(context));

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('should throw when id is not a string', async () => {
    const context = createMockCacheContext({
      entity: 'UserCache',
      params: { id: 42 },
      operation: Operation.Delete,
      options: { route: { returnDeleted: false } },
    }) as never;

    await expect(
      handler.execute(new CrudDeleteCommand<CacheInterface>(context)),
    ).rejects.toThrow();
  });
});
