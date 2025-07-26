import { Inject, Injectable } from '@nestjs/common';

import { CrudAdapter } from '../../crud/adapters/crud.adapter';
import { CrudService } from '../../services/crud.service';

import { PhotoTypeOrmCrudAdapterFixture } from './photo-typeorm-crud.adapter.fixture';
import { PhotoFixture } from './photo.entity.fixture';

/**
 * Photo CRUD service
 */
@Injectable()
export class PhotoServiceFixture extends CrudService<PhotoFixture> {
  constructor(
    @Inject(PhotoTypeOrmCrudAdapterFixture)
    crudAdapter: CrudAdapter<PhotoFixture>,
  ) {
    super(crudAdapter);
  }
}
