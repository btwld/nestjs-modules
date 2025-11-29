import { Injectable } from '@nestjs/common';

import {
  InjectDynamicRepository,
  RoleEntityInterface,
} from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { ROLE_MODULE_ROLE_ENTITY_KEY } from '../../role.constants';

/**
 * Role TypeOrm CRUD adapter fixture
 */
@Injectable()
export class RoleTypeOrmCrudAdapterFixture extends TypeOrmCrudAdapter<RoleEntityInterface> {
  /**
   * Constructor
   *
   * @param roleRepoAdapter - instance of the role repository adapter.
   */
  constructor(
    @InjectDynamicRepository(ROLE_MODULE_ROLE_ENTITY_KEY)
    roleRepoAdapter: TypeOrmRepositoryAdapter<RoleEntityInterface>,
  ) {
    super(roleRepoAdapter);
  }
}
