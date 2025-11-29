import { Injectable } from '@nestjs/common';

import { InjectDynamicRepository } from '@concepta/nestjs-common';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { TypeOrmCrudAdapter } from '../../../crud/adapters/typeorm-crud.adapter';
import { CRUD_TEST_COMPANY_ENTITY_KEY } from '../../crud-test.constants';

import { CompanyEntity } from './company.entity';

@Injectable()
export class CompanyTypeOrmCrudAdapter extends TypeOrmCrudAdapter<CompanyEntity> {
  constructor(
    @InjectDynamicRepository(CRUD_TEST_COMPANY_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<CompanyEntity>,
  ) {
    super(repoAdapter);
  }
}
