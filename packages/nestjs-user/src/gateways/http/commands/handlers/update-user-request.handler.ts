import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { UpdateUserCommand } from '../../../../application/commands/impl/update-user.command.js';
import { assertUserId } from '../../../../application/utils/assert-user-id.util.js';
import { User } from '../../../../domain/aggregates/user.js';
import { UpdateUserRequest } from '../impl/update-user.request.js';

@Injectable()
export class UpdateUserRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: UpdateUserRequest) {
    const { context, dto } = command;
    const { id } = context.params;

    assertUserId(id);

    const user = await this.commandBus.execute<UpdateUserCommand, User>(
      new UpdateUserCommand(context, id, dto),
    );
    return user.toPlain();
  }
}
