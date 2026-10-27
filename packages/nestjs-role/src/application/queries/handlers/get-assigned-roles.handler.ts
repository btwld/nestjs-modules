import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { RoleAssignment } from '../../../domain/aggregates/role-assignment.js';
import { RoleAssignmentRepositoryResolverInterface } from '../../../domain/repositories/role-assignment-repository-resolver.interface.js';
import { ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN } from '../../../role.constants.js';
import { GetAssignedRolesQuery } from '../impl/get-assigned-roles.query.js';

@QueryHandler(GetAssignedRolesQuery)
export class GetAssignedRolesHandler implements IQueryHandler<GetAssignedRolesQuery> {
  constructor(
    @Inject(ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: RoleAssignmentRepositoryResolverInterface,
  ) {}

  async execute(query: GetAssignedRolesQuery): Promise<RoleAssignment[]> {
    const { ctx, namespace, assigneeId } = query;

    const assignmentRepo = this.repositoryResolver.resolve(namespace);

    return assignmentRepo.findByAssignee(ctx, assigneeId);
  }
}
