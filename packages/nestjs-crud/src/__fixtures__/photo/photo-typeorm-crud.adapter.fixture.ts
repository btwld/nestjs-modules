import { Injectable } from '@nestjs/common';

import { InjectDynamicRepository } from '@concepta/nestjs-common';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { TypeOrmCrudAdapter } from '../../crud/adapters/typeorm-crud.adapter';
import { CRUD_TEST_PHOTO_ENTITY_KEY } from '../crud-test.constants';

import { PhotoEntityInterfaceFixture } from './interfaces/photo-entity.interface.fixture';

/**
 * Photo CRUD Adapter Fixture
 */
@Injectable()
export class PhotoTypeOrmCrudAdapterFixture extends TypeOrmCrudAdapter<PhotoEntityInterfaceFixture> {
  constructor(
    @InjectDynamicRepository(CRUD_TEST_PHOTO_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<PhotoEntityInterfaceFixture>,
  ) {
    super(repoAdapter);
  }
}
