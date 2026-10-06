import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { RemoveUserCommand } from '../../../../application/commands/impl/remove-user.command.js';
import { assertUserId } from '../../../../application/utils/assert-user-id.util.js';
import { User } from '../../../../domain/aggregates/user.js';
import { DeleteUserRequest } from '../impl/delete-user.request.js';

@Injectable()
export class DeleteUserRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: DeleteUserRequest) {
    const { context } = command;
    const { id } = context.params;
    const { returnDeleted = false } = context.options?.route ?? {};

    assertUserId(id);

    const user = await this.commandBus.execute<RemoveUserCommand, User>(
      new RemoveUserCommand(context, id),
    );

    return returnDeleted ? user.toPlain() : null;
  }
}
