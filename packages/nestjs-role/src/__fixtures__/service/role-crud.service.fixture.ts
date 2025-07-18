import { Inject, Injectable } from '@nestjs/common';

import { RoleEntityInterface } from '@concepta/nestjs-common';
import { CrudService } from '@concepta/nestjs-crud';
import { CrudAdapter } from '@concepta/nestjs-crud/dist/crud/adapters/crud.adapter';

import { RoleTypeOrmCrudAdapterFixture } from './role-typeorm-crud.adapter.fixture';

/**
 * Role CRUD service
 */
@Injectable()
export class RoleCrudServiceFixture extends CrudService<RoleEntityInterface> {
  /**
   * Constructor
   *
   * @param crudAdapter - instance of the role repository.
   */
  constructor(
    @Inject(RoleTypeOrmCrudAdapterFixture)
    crudAdapter: CrudAdapter<RoleEntityInterface>,
  ) {
    super(crudAdapter);
  }
}
