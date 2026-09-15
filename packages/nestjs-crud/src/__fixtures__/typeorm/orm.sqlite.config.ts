import { type TypeOrmModuleOptions } from '@nestjs/typeorm';

import { CompanyEntity } from './company/company.entity.js';
import { DeviceEntity } from './device/device.entity.js';
import { NoteEntity } from './note/note.entity.js';
import { ProjectEntity } from './project/project.entity.js';
import { UserProfileEntity } from './user-profile/user-profile.entity.js';
import { UserEntity } from './users/user.entity.js';

export const ormSqliteConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: ':memory:',
  entities: [
    CompanyEntity,
    DeviceEntity,
    NoteEntity,
    ProjectEntity,
    UserProfileEntity,
    UserEntity,
  ],
  synchronize: true,
};
