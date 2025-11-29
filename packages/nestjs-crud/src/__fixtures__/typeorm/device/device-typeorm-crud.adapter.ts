import { Injectable } from '@nestjs/common';

import { InjectDynamicRepository } from '@concepta/nestjs-common';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { TypeOrmCrudAdapter } from '../../../crud/adapters/typeorm-crud.adapter';
import { CRUD_TEST_DEVICE_ENTITY_KEY } from '../../crud-test.constants';

import { DeviceEntity } from './device.entity';

@Injectable()
export class DeviceTypeOrmCrudAdapter extends TypeOrmCrudAdapter<DeviceEntity> {
  constructor(
    @InjectDynamicRepository(CRUD_TEST_DEVICE_ENTITY_KEY)
    repoAdapter: TypeOrmRepositoryAdapter<DeviceEntity>,
  ) {
    super(repoAdapter);
  }
}
