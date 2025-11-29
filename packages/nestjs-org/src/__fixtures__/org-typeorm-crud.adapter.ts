import { Injectable } from '@nestjs/common';

import {
  InjectDynamicRepository,
  OrgEntityInterface,
} from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { ORG_MODULE_ORG_ENTITY_KEY } from '../org.constants';

/**
 * Org TypeORM CRUD adapter
 */
@Injectable()
export class OrgTypeOrmCrudAdapter<
  T extends OrgEntityInterface,
> extends TypeOrmCrudAdapter<T> {
  /**
   * Constructor
   *
   * @param repoAdapter - instance of the org repository adapter.
   */
  constructor(
    @InjectDynamicRepository(ORG_MODULE_ORG_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<T>,
  ) {
    super(repoAdapter);
  }
}
