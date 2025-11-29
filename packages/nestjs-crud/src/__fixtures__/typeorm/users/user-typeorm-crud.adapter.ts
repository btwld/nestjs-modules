import { Injectable } from '@nestjs/common';

import { InjectDynamicRepository } from '@concepta/nestjs-common';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { TypeOrmCrudAdapter } from '../../../crud/adapters/typeorm-crud.adapter';
import { CRUD_TEST_USER_ENTITY_KEY } from '../../crud-test.constants';

import { UserEntity } from './user.entity';

@Injectable()
export class UserTypeOrmCrudAdapter extends TypeOrmCrudAdapter<UserEntity> {
  constructor(
    @InjectDynamicRepository(CRUD_TEST_USER_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<UserEntity>,
  ) {
    super(repoAdapter);
  }
}
