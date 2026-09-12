import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { RoleAssignmentRepositoryResolverInterface } from '../../../domain/repositories/role-assignment-repository-resolver.interface.js';
import { ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN } from '../../../role.constants.js';
import { IsAssignedRolesQuery } from '../impl/is-assigned-roles.query.js';

@QueryHandler(IsAssignedRolesQuery)
export class IsAssignedRolesHandler implements IQueryHandler<IsAssignedRolesQuery> {
  constructor(
    @Inject(ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: RoleAssignmentRepositoryResolverInterface,
  ) {}

  async execute(query: IsAssignedRolesQuery): Promise<boolean> {
    const { ctx, namespace, roleIds, assigneeId } = query;

    if (roleIds.length === 0) {
      return false;
    }

    const assignmentRepo = this.repositoryResolver.resolve(namespace);

    const count = await assignmentRepo.countByRoleIdsAndAssignee(
      ctx,
      roleIds,
      assigneeId,
    );

    return count === roleIds.length;
  }
}
