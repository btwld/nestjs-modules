import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { TypeOrmCrudAdapter } from '../../crud/adapters/typeorm-crud.adapter';

import { PhotoEntityInterfaceFixture } from './interfaces/photo-entity.interface.fixture';
import { PhotoFixture } from './photo.entity.fixture';

/**
 * Photo CRUD Adapter Fixture
 */
@Injectable()
export class PhotoTypeOrmCrudAdapterFixture extends TypeOrmCrudAdapter<PhotoEntityInterfaceFixture> {
  constructor(
    @InjectRepository(PhotoFixture)
    repo: Repository<PhotoEntityInterfaceFixture>,
  ) {
    super(repo);
  }
}
