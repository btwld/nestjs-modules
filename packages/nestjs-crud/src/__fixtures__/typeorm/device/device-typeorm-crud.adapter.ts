import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { TypeOrmCrudAdapter } from '../../../crud/adapters/typeorm-crud.adapter';

import { DeviceEntity } from './device.entity';

@Injectable()
export class DeviceTypeOrmCrudAdapter extends TypeOrmCrudAdapter<DeviceEntity> {
  constructor(@InjectRepository(DeviceEntity) repo: Repository<DeviceEntity>) {
    super(repo);
  }
}
