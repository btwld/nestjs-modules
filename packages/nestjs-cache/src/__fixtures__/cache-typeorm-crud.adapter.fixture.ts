import { Injectable } from '@nestjs/common';

import {
  CacheInterface,
  InjectDynamicRepository,
} from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { CACHE_MODULE_CACHE_ENTITY_KEY } from '../cache.constants';

/**
 * Cache typeorm CRUD adapter
 */
@Injectable()
export class CacheTypeOrmCrudAdapterFixture extends TypeOrmCrudAdapter<CacheInterface> {
  /**
   * Constructor
   *
   * @param repoAdapter - instance of the cache repository adapter.
   */
  constructor(
    @InjectDynamicRepository(CACHE_MODULE_CACHE_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<CacheInterface>,
  ) {
    super(repoAdapter);
  }
}
