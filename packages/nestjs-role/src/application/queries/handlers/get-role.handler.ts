import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { Role } from '../../../domain/aggregates/role.js';
import { RoleRepositoryResolverInterface } from '../../../domain/repositories/role-repository-resolver.interface.js';
import { ROLE_REPOSITORY_RESOLVER_TOKEN } from '../../../role.constants.js';
import { RoleNotFoundException } from '../../exceptions/role-not-found.exception.js';
import { GetRoleQuery } from '../impl/get-role.query.js';

@QueryHandler(GetRoleQuery)
export class GetRoleHandler implements IQueryHandler<GetRoleQuery> {
  constructor(
    @Inject(ROLE_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: RoleRepositoryResolverInterface,
  ) {}

  async execute(query: GetRoleQuery): Promise<Role> {
    const { ctx, namespace, id } = query;

    const roleRepo = this.repositoryResolver.resolve(namespace);

    const role = await roleRepo.get(ctx, id);

    if (!role) {
      throw new RoleNotFoundException({ id: String(id) });
    }

    return role;
  }
}
