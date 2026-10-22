import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { Operation } from '@concepta/nestjs-core';

import { ArchiveCacheCommand } from '../../../../application/commands/impl/archive-cache.command.js';
import { RemoveCacheCommand } from '../../../../application/commands/impl/remove-cache.command.js';
import { assertCacheId } from '../../../../application/utils/assert-cache-id.util.js';
import { Cache } from '../../../../domain/aggregates/cache.js';
import { DeleteCacheRequest } from '../impl/delete-cache.request.js';

@Injectable()
export class DeleteCacheRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: DeleteCacheRequest) {
    const { context } = command;
    const { id } = context.params;
    const { returnDeleted = false } = context.options?.route ?? {};

    assertCacheId(id);

    const { namespace } = context.withCache();
    let cache: Cache;

    if (context.operation === Operation.SoftDelete) {
      cache = await this.commandBus.execute(
        new ArchiveCacheCommand(context, namespace, id),
      );
    } else {
      cache = await this.commandBus.execute(
        new RemoveCacheCommand(context, namespace, id),
      );
    }

    return returnDeleted ? cache.toPlain() : null;
  }
}
