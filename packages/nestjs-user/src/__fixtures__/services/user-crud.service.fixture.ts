import { Inject, Injectable } from '@nestjs/common';

import { UserEntityInterface } from '@concepta/nestjs-common';
import { CrudService } from '@concepta/nestjs-crud';
import { CrudAdapter } from '@concepta/nestjs-crud/src/crud/adapters/crud.adapter';

import { UserTypeOrmCrudAdapterFixture } from './user-typeorm-crud.adapter.fixture';

/**
 * User CRUD service fixture
 */
@Injectable()
export class UserCrudServiceFixture extends CrudService<UserEntityInterface> {
  /**
   * Constructor
   *
   * @param crudAdapter - instance of the user crud adapter.
   */
  constructor(
    @Inject(UserTypeOrmCrudAdapterFixture)
    protected readonly crudAdapter: CrudAdapter<UserEntityInterface>,
  ) {
    super(crudAdapter);
  }
}
