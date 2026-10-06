import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { AccessControlServiceInterface } from '../../../domain/ports/access-control-service.interface.js';
import { AccessControlService } from '../../../infrastructure/services/access-control.service.js';
import { ResolveUserRolesQuery } from '../impl/resolve-user-roles.query.js';

@QueryHandler(ResolveUserRolesQuery)
export class ResolveUserRolesHandler implements IQueryHandler<
  ResolveUserRolesQuery,
  string | string[]
> {
  constructor(
    @Inject(AccessControlService)
    private readonly service: AccessControlServiceInterface,
  ) {}

  async execute(query: ResolveUserRolesQuery): Promise<string | string[]> {
    return this.service.getUserRoles(query.executionContext);
  }
}
