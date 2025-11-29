import {
  InjectDynamicRepository,
  RoleAssignmentInterface,
} from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { ROLE_MODULE_API_KEY_ROLE_ENTITY_KEY } from '../../role.constants';

/**
 * Role assignment CRUD service
 */
export class ApiKeyAssignmentTypeOrmCrudAdapterFixture extends TypeOrmCrudAdapter<RoleAssignmentInterface> {
  /**
   * Constructor
   *
   * @param repoAdapter Crud adapter for api key assignment entities
   */
  constructor(
    @InjectDynamicRepository(ROLE_MODULE_API_KEY_ROLE_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<RoleAssignmentInterface>,
  ) {
    super(repoAdapter);
  }
}
