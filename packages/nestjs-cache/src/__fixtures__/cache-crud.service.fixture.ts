import { Inject, Injectable } from '@nestjs/common';

import { CacheInterface } from '@concepta/nestjs-common';
import { CrudAdapter, CrudService } from '@concepta/nestjs-crud';

import { CacheTypeOrmCrudAdapterFixture } from './cache-typeorm-crud.adapter.fixture';

/**
 * Cache CRUD service
 */
@Injectable()
export class CacheCrudServiceFixture extends CrudService<CacheInterface> {
  /**
   * Constructor
   *
   * @param crudAdapter - instance of the cache crud adapter.
   */
  constructor(
    @Inject(CacheTypeOrmCrudAdapterFixture)
    crudAdapter: CrudAdapter<CacheInterface>,
  ) {
    super(crudAdapter);
  }
}
