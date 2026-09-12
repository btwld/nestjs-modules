import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { RoleAssignment } from '../../../domain/aggregates/role-assignment.js';
import { RoleAssignmentRepositoryResolverInterface } from '../../../domain/repositories/role-assignment-repository-resolver.interface.js';
import { ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN } from '../../../role.constants.js';
import { RoleAssignmentConflictException } from '../../exceptions/role-assignment-conflict.exception.js';
import { AssignRoleCommand } from '../impl/assign-role.command.js';

@CommandHandler(AssignRoleCommand)
export class AssignRoleHandler implements ICommandHandler<AssignRoleCommand> {
  constructor(
    @Inject(ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: RoleAssignmentRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: AssignRoleCommand): Promise<RoleAssignment> {
    const { ctx, namespace, roleId, assigneeId } = command;
    const assignmentRepo = this.repositoryResolver.resolve(namespace);

    const eventContext = createEventContext(ctx, { namespace }, {});

    return this.txScope.run(ctx, async (txCtx) => {
      const count = await assignmentRepo.countByRoleIdAndAssignee(
        txCtx,
        roleId,
        assigneeId,
      );

      if (count > 0) {
        throw new RoleAssignmentConflictException(roleId, assigneeId);
      }

      const roleAssignment = this.eventPublisher.mergeObjectContext(
        RoleAssignment.create(eventContext, { roleId, assigneeId }),
      );

      await assignmentRepo.save(txCtx, roleAssignment);

      txCtx.trx.onCommit(() => roleAssignment.commit());
      txCtx.trx.onRollback(() => roleAssignment.uncommit());

      return roleAssignment;
    });
  }
}
