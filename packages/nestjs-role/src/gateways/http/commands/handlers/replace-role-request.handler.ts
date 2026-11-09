import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { ReplaceRoleCommand } from '../../../../application/commands/impl/replace-role.command.js';
import { assertRoleId } from '../../../../application/utils/assert-role-id.util.js';
import { Role } from '../../../../domain/aggregates/role.js';
import { ReplaceRoleRequest } from '../impl/replace-role.request.js';

@Injectable()
export class ReplaceRoleRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: ReplaceRoleRequest) {
    const { context, dto } = command;
    const { id } = context.params;

    assertRoleId(id);

    const { namespace } = context.withRole();
    const role = await this.commandBus.execute<ReplaceRoleCommand, Role>(
      new ReplaceRoleCommand(context, namespace, id, dto),
    );
    return role.toPlain();
  }
}
