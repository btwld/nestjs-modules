import {
  InjectDynamicRepository,
  RoleAssignmentInterface,
} from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { ROLE_MODULE_USER_ROLE_ENTITY_KEY } from '../../role.constants';

/**
 * Role assignment CRUD service
 */
export class UserRoleAssignmentTypeOrmCrudAdapterFixture extends TypeOrmCrudAdapter<RoleAssignmentInterface> {
  /**
   * Constructor
   *
   * @param repoAdapter Crud adapter for role assignment entities
   */
  constructor(
    @InjectDynamicRepository(ROLE_MODULE_USER_ROLE_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<RoleAssignmentInterface>,
  ) {
    super(repoAdapter);
  }
}
