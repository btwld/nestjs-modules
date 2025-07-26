import { Injectable } from '@nestjs/common';

import { CrudService } from '../../../services/crud.service';

import { DeviceTypeOrmCrudAdapter } from './device-typeorm-crud.adapter';
import { DeviceEntity } from './device.entity';

@Injectable()
export class DeviceCrudService extends CrudService<DeviceEntity> {
  constructor(crudAdapter: DeviceTypeOrmCrudAdapter) {
    super(crudAdapter);
  }
}
