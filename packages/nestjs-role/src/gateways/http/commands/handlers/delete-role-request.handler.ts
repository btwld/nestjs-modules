import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { RemoveRoleCommand } from '../../../../application/commands/impl/remove-role.command.js';
import { assertRoleId } from '../../../../application/utils/assert-role-id.util.js';
import { DeleteRoleRequest } from '../impl/delete-role.request.js';

@Injectable()
export class DeleteRoleRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: DeleteRoleRequest) {
    const { context } = command;
    const { id } = context.params;

    assertRoleId(id);

    const { namespace } = context.withRole();
    await this.commandBus.execute(
      new RemoveRoleCommand(context, namespace, id),
    );

    return null;
  }
}
