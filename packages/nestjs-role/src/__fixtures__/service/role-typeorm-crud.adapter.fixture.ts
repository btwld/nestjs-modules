import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { RoleEntityInterface } from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';

import { RoleEntityFixture } from '../entities/role-entity.fixture';

/**
 * Role TypeOrm CRUD adapter fixture
 */
@Injectable()
export class RoleTypeOrmCrudAdapterFixture extends TypeOrmCrudAdapter<RoleEntityInterface> {
  /**
   * Constructor
   *
   * @param roleRepo - instance of the role repository.
   */
  constructor(
    @InjectRepository(RoleEntityFixture)
    roleRepo: Repository<RoleEntityInterface>,
  ) {
    super(roleRepo);
  }
}
