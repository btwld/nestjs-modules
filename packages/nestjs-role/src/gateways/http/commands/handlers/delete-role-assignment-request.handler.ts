import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { RevokeRoleCommand } from '../../../../application/commands/impl/revoke-role.command.js';
import { GetRoleAssignmentQuery } from '../../../../application/queries/impl/get-role-assignment.query.js';
import { assertRoleId } from '../../../../application/utils/assert-role-id.util.js';
import { RoleAssignment } from '../../../../domain/aggregates/role-assignment.js';
import { DeleteRoleAssignmentRequest } from '../impl/delete-role-assignment.request.js';

@Injectable()
export class DeleteRoleAssignmentRequestHandler {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: DeleteRoleAssignmentRequest) {
    const { context } = command;
    const { id } = context.params;

    assertRoleId(id);

    const { namespace } = context.withRole();
    const assignment = await this.queryBus.execute<
      GetRoleAssignmentQuery,
      RoleAssignment
    >(new GetRoleAssignmentQuery(context, namespace, id));

    await this.commandBus.execute(
      new RevokeRoleCommand(
        context,
        namespace,
        assignment.roleId,
        assignment.assigneeId,
      ),
    );

    return null;
  }
}
