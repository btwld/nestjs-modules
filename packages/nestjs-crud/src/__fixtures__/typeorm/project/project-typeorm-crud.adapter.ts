import { Injectable } from '@nestjs/common';

import { InjectDynamicRepository } from '@concepta/nestjs-common';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { TypeOrmCrudAdapter } from '../../../crud/adapters/typeorm-crud.adapter';
import { CRUD_TEST_PROJECT_ENTITY_KEY } from '../../crud-test.constants';

import { ProjectEntity } from './project.entity';

@Injectable()
export class ProjectTypeOrmCrudAdapter extends TypeOrmCrudAdapter<ProjectEntity> {
  constructor(
    @InjectDynamicRepository(CRUD_TEST_PROJECT_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<ProjectEntity>,
  ) {
    super(repoAdapter);
  }
}
