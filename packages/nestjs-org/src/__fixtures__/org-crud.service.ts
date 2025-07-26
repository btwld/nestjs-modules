import { Inject, Injectable } from '@nestjs/common';

import { OrgEntityInterface } from '@concepta/nestjs-common';
import { CrudService, CrudAdapter } from '@concepta/nestjs-crud';

import { OrgTypeOrmCrudAdapter } from './org-typeorm-crud.adapter';

/**
 * Org CRUD service
 */
@Injectable()
export class OrgCrudService extends CrudService<OrgEntityInterface> {
  /**
   * Constructor
   *
   * @param crudAdapter - instance of the org crud adapter.
   */
  constructor(
    @Inject(OrgTypeOrmCrudAdapter)
    crudAdapter: CrudAdapter<OrgEntityInterface>,
  ) {
    super(crudAdapter);
  }
}
