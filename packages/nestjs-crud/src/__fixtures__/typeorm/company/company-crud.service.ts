import { Injectable } from '@nestjs/common';

import { CrudService } from '../../../services/crud.service';

import { CompanyTypeOrmCrudAdapter } from './company-typeorm-crud.adapter';
import { CompanyEntity } from './company.entity';

@Injectable()
export class CompanyCrudService extends CrudService<CompanyEntity> {
  constructor(crudAdapter: CompanyTypeOrmCrudAdapter) {
    super(crudAdapter);
  }
}
