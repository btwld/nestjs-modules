import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { UpdateCacheCommand } from '../../../../application/commands/impl/update-cache.command.js';
import { assertCacheId } from '../../../../application/utils/assert-cache-id.util.js';
import { UpdateCacheRequest } from '../impl/update-cache.request.js';

@Injectable()
export class UpdateCacheRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: UpdateCacheRequest) {
    const { context, dto } = command;
    const { id } = context.params;

    assertCacheId(id);

    const { namespace } = context.withCache();
    const cache = await this.commandBus.execute(
      new UpdateCacheCommand(context, namespace, id, dto),
    );
    return cache.toPlain();
  }
}
