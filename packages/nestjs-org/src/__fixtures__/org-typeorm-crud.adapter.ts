import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { OrgEntityInterface } from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';

import { OrgEntityFixture } from './org-entity.fixture';

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
   * @param orgRepo - instance of the org repository.
   */
  constructor(
    @InjectRepository(OrgEntityFixture)
    orgRepo: Repository<T>,
  ) {
    super(orgRepo);
  }
}
