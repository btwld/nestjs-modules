import { Injectable } from '@nestjs/common';

import { InjectDynamicRepository } from '@concepta/nestjs-common';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { TypeOrmCrudAdapter } from '../../../crud/adapters/typeorm-crud.adapter';
import { CRUD_TEST_NOTE_ENTITY_KEY } from '../../crud-test.constants';

import { NoteEntity } from './note.entity';

@Injectable()
export class NoteTypeOrmCrudAdapter extends TypeOrmCrudAdapter<NoteEntity> {
  constructor(
    @InjectDynamicRepository(CRUD_TEST_NOTE_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<NoteEntity>,
  ) {
    super(repoAdapter);
  }
}
