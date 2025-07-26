import { Injectable } from '@nestjs/common';

import { CrudService } from '../../../services/crud.service';

import { NoteTypeOrmCrudAdapter } from './note-typeorm-crud.adapter';
import { NoteEntity } from './note.entity';

@Injectable()
export class NoteCrudService extends CrudService<NoteEntity> {
  constructor(crudAdapter: NoteTypeOrmCrudAdapter) {
    super(crudAdapter);
  }
}
