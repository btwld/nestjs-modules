import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { RoleAssignment } from '../../../domain/aggregates/role-assignment.js';
import { RoleAssignmentRepositoryResolverInterface } from '../../../domain/repositories/role-assignment-repository-resolver.interface.js';
import { ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN } from '../../../role.constants.js';
import { RoleAssignmentsConflictException } from '../../exceptions/role-assignments-conflict.exception.js';
import { AssignRolesCommand } from '../impl/assign-roles.command.js';

@CommandHandler(AssignRolesCommand)
export class AssignRolesHandler implements ICommandHandler<AssignRolesCommand> {
  constructor(
    @Inject(ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: RoleAssignmentRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: AssignRolesCommand): Promise<RoleAssignment[]> {
    const { ctx, namespace, roleIds, assigneeId } = command;
    const assignmentRepo = this.repositoryResolver.resolve(namespace);

    const eventContext = createEventContext(ctx, { namespace }, {});

    return this.txScope.run(ctx, async (txCtx) => {
      const existingCount = await assignmentRepo.countByRoleIdsAndAssignee(
        txCtx,
        roleIds,
        assigneeId,
      );

      if (existingCount > 0) {
        throw new RoleAssignmentsConflictException(assigneeId);
      }

      const roleAssignments = roleIds.map((roleId) =>
        this.eventPublisher.mergeObjectContext(
          RoleAssignment.create(eventContext, { roleId, assigneeId }),
        ),
      );

      await assignmentRepo.saveMany(txCtx, roleAssignments);

      txCtx.trx.onCommit(() => roleAssignments.forEach((ra) => ra.commit()));
      txCtx.trx.onRollback(() =>
        roleAssignments.forEach((ra) => ra.uncommit()),
      );

      return roleAssignments;
    });
  }
}
