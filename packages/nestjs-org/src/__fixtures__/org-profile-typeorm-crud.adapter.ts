import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { OrgProfileEntityInterface } from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';

import { OrgProfileEntityFixture } from './org-profile.entity.fixture';

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
   * @param orgRepo - instance of the org repository.
   */
  constructor(
    @InjectRepository(OrgProfileEntityFixture)
    orgRepo: Repository<T>,
  ) {
    super(orgRepo);
  }
}
