import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { UserProfileEntityInterface } from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';

import { UserProfileEntityFixture } from '../user-profile.entity.fixture';

/**
 * User Profile TypeOrm CRUD adapter fixture
 */
@Injectable()
export class UserProfileTypeOrmCrudAdapterFixture<
  T extends UserProfileEntityInterface,
> extends TypeOrmCrudAdapter<T> {
  /**
   * Constructor
   *
   * @param userRepo - instance of the user repository.
   */
  constructor(
    @InjectRepository(UserProfileEntityFixture)
    protected readonly userRepo: Repository<T>,
  ) {
    super(userRepo);
  }
}
