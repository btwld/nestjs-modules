import { Injectable } from '@nestjs/common';

import { CrudService } from '../../../services/crud.service';

import { UserTypeOrmCrudAdapter } from './user-typeorm-crud.adapter';
import { UserEntity } from './user.entity';

@Injectable()
export class UserCrudService extends CrudService<UserEntity> {
  constructor(crudAdapter: UserTypeOrmCrudAdapter) {
    super(crudAdapter);
  }
}
