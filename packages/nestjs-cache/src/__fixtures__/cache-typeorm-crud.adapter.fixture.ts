import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CacheInterface } from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';

import { UserCacheEntityFixture } from './entities/user-cache-entity.fixture';

/**
 * Cache typeorm CRUD adapter
 */
@Injectable()
export class CacheTypeOrmCrudAdapterFixture extends TypeOrmCrudAdapter<CacheInterface> {
  /**
   * Constructor
   *
   * @param repo - instance of the cache repository.
   */
  constructor(
    @InjectRepository(UserCacheEntityFixture)
    repo: Repository<CacheInterface>,
  ) {
    super(repo);
  }
}
