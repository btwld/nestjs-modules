import { Inject } from '@nestjs/common';

import { RoleAssignmentInterface } from '@concepta/nestjs-common';
import { CrudService } from '@concepta/nestjs-crud';
import { CrudAdapter } from '@concepta/nestjs-crud/dist/crud/adapters/crud.adapter';

import { UserRoleAssignmentTypeOrmCrudAdapterFixture } from './user-role-assignment-typeorm-crud.adapter.fixture';

/**
 * Role assignment CRUD service
 */
export class UserRoleAssignmentCrudServiceFixture extends CrudService<RoleAssignmentInterface> {
  /**
   * Constructor
   *
   * @param crudAdapter Crud service for role assignment entities
   */
  constructor(
    @Inject(UserRoleAssignmentTypeOrmCrudAdapterFixture)
    protected readonly crudAdapter: CrudAdapter<RoleAssignmentInterface>,
  ) {
    super(crudAdapter);
  }
}
