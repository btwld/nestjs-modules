import { Injectable } from '@nestjs/common';

import { CrudService } from '../../../services/crud.service';

import { ProjectTypeOrmCrudAdapter } from './project-typeorm-crud.adapter';
import { ProjectEntity } from './project.entity';

@Injectable()
export class ProjectCrudService extends CrudService<ProjectEntity> {
  constructor(crudAdapter: ProjectTypeOrmCrudAdapter) {
    super(crudAdapter);
  }
}
