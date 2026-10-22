import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { RoleAssignment } from '../../../domain/aggregates/role-assignment.js';
import { RoleAssignmentRepositoryResolverInterface } from '../../../domain/repositories/role-assignment-repository-resolver.interface.js';
import { ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN } from '../../../role.constants.js';
import { RoleAssignmentNotFoundException } from '../../exceptions/role-assignment-not-found.exception.js';
import { GetRoleAssignmentQuery } from '../impl/get-role-assignment.query.js';

@QueryHandler(GetRoleAssignmentQuery)
export class GetRoleAssignmentHandler implements IQueryHandler<GetRoleAssignmentQuery> {
  constructor(
    @Inject(ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: RoleAssignmentRepositoryResolverInterface,
  ) {}

  async execute(query: GetRoleAssignmentQuery): Promise<RoleAssignment> {
    const { ctx, namespace, id } = query;

    const assignmentRepo = this.repositoryResolver.resolve(namespace);

    const assignment = await assignmentRepo.get(ctx, id);

    if (!assignment) {
      throw new RoleAssignmentNotFoundException(String(id));
    }

    return assignment;
  }
}
