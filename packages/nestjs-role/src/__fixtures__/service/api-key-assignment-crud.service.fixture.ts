import { Inject } from '@nestjs/common';

import { RoleAssignmentInterface } from '@concepta/nestjs-common';
import { CrudService } from '@concepta/nestjs-crud';
import { CrudAdapter } from '@concepta/nestjs-crud/dist/crud/adapters/crud.adapter';

import { ApiKeyAssignmentTypeOrmCrudAdapterFixture } from './api-key-assignment-typeorm-crud.adapter.fixture';

/**
 * Api key assignment CRUD service
 */
export class ApiKeyAssignmentCrudServiceFixture extends CrudService<RoleAssignmentInterface> {
  /**
   * Constructor
   *
   * @param crudAdapter Crud adapter for api key assignment entities
   */
  constructor(
    @Inject(ApiKeyAssignmentTypeOrmCrudAdapterFixture)
    protected readonly crudAdapter: CrudAdapter<RoleAssignmentInterface>,
  ) {
    super(crudAdapter);
  }
}
