import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { UpdateRoleCommand } from '../../../../application/commands/impl/update-role.command.js';
import { assertRoleId } from '../../../../application/utils/assert-role-id.util.js';
import { Role } from '../../../../domain/aggregates/role.js';
import { UpdateRoleRequest } from '../impl/update-role.request.js';

@Injectable()
export class UpdateRoleRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: UpdateRoleRequest) {
    const { context, dto } = command;
    const { id } = context.params;

    assertRoleId(id);

    const { namespace } = context.withRole();
    const role = await this.commandBus.execute<UpdateRoleCommand, Role>(
      new UpdateRoleCommand(context, namespace, id, dto),
    );
    return role.toPlain();
  }
}
