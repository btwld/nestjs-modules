import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { TypeOrmCrudAdapter } from '../../../crud/adapters/typeorm-crud.adapter';

import { NoteEntity } from './note.entity';

@Injectable()
export class NoteTypeOrmCrudAdapter extends TypeOrmCrudAdapter<NoteEntity> {
  constructor(@InjectRepository(NoteEntity) repo: Repository<NoteEntity>) {
    super(repo);
  }
}
