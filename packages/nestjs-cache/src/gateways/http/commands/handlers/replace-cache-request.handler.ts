import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { ReplaceCacheCommand } from '../../../../application/commands/impl/replace-cache.command.js';
import { assertCacheId } from '../../../../application/utils/assert-cache-id.util.js';
import { ReplaceCacheRequest } from '../impl/replace-cache.request.js';

@Injectable()
export class ReplaceCacheRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: ReplaceCacheRequest) {
    const { context, dto } = command;
    const { id } = context.params;

    assertCacheId(id);

    const { namespace } = context.withCache();
    const cache = await this.commandBus.execute(
      new ReplaceCacheCommand(context, namespace, id, dto),
    );
    return cache.toPlain();
  }
}
