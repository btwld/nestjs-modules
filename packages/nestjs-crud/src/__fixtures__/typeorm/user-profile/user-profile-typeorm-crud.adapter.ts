import { Injectable } from '@nestjs/common';

import { InjectDynamicRepository } from '@concepta/nestjs-common';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { TypeOrmCrudAdapter } from '../../../crud/adapters/typeorm-crud.adapter';
import { CRUD_TEST_USER_PROFILE_ENTITY_KEY } from '../../crud-test.constants';

import { UserProfileEntity } from './user-profile.entity';

@Injectable()
export class UserProfileTypeOrmCrudAdapter extends TypeOrmCrudAdapter<UserProfileEntity> {
  constructor(
    @InjectDynamicRepository(CRUD_TEST_USER_PROFILE_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<UserProfileEntity>,
  ) {
    super(repoAdapter);
  }
}
