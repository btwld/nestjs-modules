import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CreateCacheCommand } from '../../../../application/commands/impl/create-cache.command.js';
import { CreateCacheRequest } from '../impl/create-cache.request.js';

@Injectable()
export class CreateCacheRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: CreateCacheRequest) {
    const { context, dto } = command;
    const { namespace } = context.withCache();
    const cache = await this.commandBus.execute(
      new CreateCacheCommand(context, namespace, dto),
    );
    return cache.toPlain();
  }
}
