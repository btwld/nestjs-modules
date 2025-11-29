import { Injectable } from '@nestjs/common';

import {
  InjectDynamicRepository,
  OrgProfileEntityInterface,
} from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { ORG_MODULE_ORG_PROFILE_ENTITY_KEY } from '../org.constants';

/**
 * Org Profile TypeORM CRUD adapter
 */
@Injectable()
export class OrgProfileTypeOrmCrudAdapter<
  T extends OrgProfileEntityInterface,
> extends TypeOrmCrudAdapter<T> {
  /**
   * Constructor
   *
   * @param repoAdapter - instance of the org profile repository adapter.
   */
  constructor(
    @InjectDynamicRepository(ORG_MODULE_ORG_PROFILE_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<T>,
  ) {
    super(repoAdapter);
  }
}
