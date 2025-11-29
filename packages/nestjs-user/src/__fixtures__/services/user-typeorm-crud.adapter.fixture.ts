import { Injectable } from '@nestjs/common';

import {
  InjectDynamicRepository,
  UserEntityInterface,
} from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { USER_MODULE_USER_ENTITY_KEY } from '../../user.constants';

/**
 * User TypeOrm CRUD adapter fixture
 */
@Injectable()
export class UserTypeOrmCrudAdapterFixture extends TypeOrmCrudAdapter<UserEntityInterface> {
  /**
   * Constructor
   *
   * @param userRepoAdapter - instance of the user repository adapter.
   */
  constructor(
    @InjectDynamicRepository(USER_MODULE_USER_ENTITY_KEY)
    userRepoAdapter: TypeOrmRepositoryAdapter<UserEntityInterface>,
  ) {
    super(userRepoAdapter);
  }
}
