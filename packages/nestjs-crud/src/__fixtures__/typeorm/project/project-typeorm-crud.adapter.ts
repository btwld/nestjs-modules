import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { TypeOrmCrudAdapter } from '../../../crud/adapters/typeorm-crud.adapter';

import { ProjectEntity } from './project.entity';

@Injectable()
export class ProjectTypeOrmCrudAdapter extends TypeOrmCrudAdapter<ProjectEntity> {
  constructor(
    @InjectRepository(ProjectEntity) repo: Repository<ProjectEntity>,
  ) {
    super(repo);
  }
}
