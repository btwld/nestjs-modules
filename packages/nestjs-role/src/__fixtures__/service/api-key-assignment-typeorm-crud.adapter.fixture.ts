import { Repository } from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';

import { RoleAssignmentInterface } from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';

import { UserRoleEntityFixture } from '../entities/user-role-entity.fixture';

/**
 * Role assignment CRUD service
 */
export class ApiKeyAssignmentTypeOrmCrudAdapterFixture extends TypeOrmCrudAdapter<RoleAssignmentInterface> {
  /**
   * Constructor
   *
   * @param userRepo Crud adapter for api key assignment entities
   */
  constructor(
    @InjectRepository(UserRoleEntityFixture)
    protected readonly userRepo: Repository<RoleAssignmentInterface>,
  ) {
    super(userRepo);
  }
}
