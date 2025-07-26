import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { TypeOrmCrudAdapter } from '../../../crud/adapters/typeorm-crud.adapter';

import { UserEntity } from './user.entity';

@Injectable()
export class UserTypeOrmCrudAdapter extends TypeOrmCrudAdapter<UserEntity> {
  constructor(@InjectRepository(UserEntity) repo: Repository<UserEntity>) {
    super(repo);
  }
}
