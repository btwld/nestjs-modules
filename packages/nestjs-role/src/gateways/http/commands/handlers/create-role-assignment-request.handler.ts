import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AssignRoleCommand } from '../../../../application/commands/impl/assign-role.command.js';
import { RoleAssignment } from '../../../../domain/aggregates/role-assignment.js';
import { CreateRoleAssignmentRequest } from '../impl/create-role-assignment.request.js';

@Injectable()
export class CreateRoleAssignmentRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: CreateRoleAssignmentRequest) {
    const { context, dto } = command;
    const { namespace } = context.withRole();
    const assignment = await this.commandBus.execute<
      AssignRoleCommand,
      RoleAssignment
    >(new AssignRoleCommand(context, namespace, dto.roleId, dto.assigneeId));
    return assignment.toPlain();
  }
}
