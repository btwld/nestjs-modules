import { Injectable } from '@nestjs/common';

import {
  InjectDynamicRepository,
  UserProfileEntityInterface,
} from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { USER_MODULE_USER_PROFILE_ENTITY_KEY } from '../../user.constants';

/**
 * User Profile TypeOrm CRUD adapter fixture
 */
@Injectable()
export class UserProfileTypeOrmCrudAdapterFixture<
  T extends UserProfileEntityInterface,
> extends TypeOrmCrudAdapter<T> {
  /**
   * Constructor
   *
   * @param repoAdapter - instance of the user profile repository adapter.
   */
  constructor(
    @InjectDynamicRepository(USER_MODULE_USER_PROFILE_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<T>,
  ) {
    super(repoAdapter);
  }
}
