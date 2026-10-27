import { CrudCreateCommand } from '@concepta/nestjs-crud';

import {
  createMockCommandBus,
  createMockCacheContext,
  createMockCacheEntity,
  toCacheDomain,
} from '../../../../../__tests__/helpers/mock.helpers.js';
import { CreateCacheCommand } from '../../../../../application/commands/impl/create-cache.command.js';
import { type CacheCreatableInterface } from '../../../../../domain/interfaces/cache-creatable.interface.js';
import { type CacheInterface } from '../../../../../domain/interfaces/cache.interface.js';
import { CreateCacheRequestHandler } from '../create-cache-request.handler.js';

describe(CreateCacheRequestHandler.name, () => {
  let commandBus: ReturnType<typeof createMockCommandBus>;
  let handler: CreateCacheRequestHandler;

  beforeEach(() => {
    commandBus = createMockCommandBus();
    handler = new CreateCacheRequestHandler(commandBus as never);
  });

  it('should return a plain object from toPlain()', async () => {
    const entity = createMockCacheEntity();
    commandBus.execute.mockResolvedValue(toCacheDomain(entity));

    const context = createMockCacheContext({ entity: 'UserCache' }) as never;
    const dto: CacheCreatableInterface = {
      key: 'test-key',
      type: 'test-type',
      data: 'test-data',
      assigneeId: 'test-assignee',
      expiresIn: '1h',
    };

    const result = await handler.execute(
      new CrudCreateCommand<CacheInterface, CacheCreatableInterface>(
        context,
        dto,
      ),
    );

    expect(result.id).toBe('test-id');
    expect(result.key).toBe('test-key');
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(CreateCacheCommand),
    );
  });
});
