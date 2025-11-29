import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CrudModule } from '@concepta/nestjs-crud';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';

import {
  ROLE_MODULE_API_KEY_ROLE_ENTITY_KEY,
  ROLE_MODULE_ROLE_ENTITY_KEY,
  ROLE_MODULE_USER_ROLE_ENTITY_KEY,
} from '../role.constants';

import { RoleControllerFixture } from './controller/role.controller.fixture';
import { UserRoleAssignmentControllerFixture } from './controller/user-role-assignment.controller.fixture';
import { ApiKeyEntityFixture } from './entities/api-key-entity.fixture';
import { ApiKeyRoleEntityFixture } from './entities/api-key-role-entity.fixture';
import { RoleEntityFixture } from './entities/role-entity.fixture';
import { UserEntityFixture } from './entities/user-entity.fixture';
import { UserRoleEntityFixture } from './entities/user-role-entity.fixture';
import { ApiKeyAssignmentCrudServiceFixture } from './service/api-key-assignment-crud.service.fixture';
import { ApiKeyAssignmentTypeOrmCrudAdapterFixture } from './service/api-key-assignment-typeorm-crud.adapter.fixture';
import { RoleCrudServiceFixture } from './service/role-crud.service.fixture';
import { RoleTypeOrmCrudAdapterFixture } from './service/role-typeorm-crud.adapter.fixture';
import { UserRoleAssignmentCrudServiceFixture } from './service/user-role-assignment-crud.service.fixture';
import { UserRoleAssignmentTypeOrmCrudAdapterFixture } from './service/user-role-assignment-typeorm-crud.adapter.fixture';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [
        RoleEntityFixture,
        UserEntityFixture,
        UserRoleEntityFixture,
        ApiKeyEntityFixture,
        ApiKeyRoleEntityFixture,
      ],
    }),
    TypeOrmModule.forFeature([
      RoleEntityFixture,
      UserEntityFixture,
      UserRoleEntityFixture,
      ApiKeyEntityFixture,
      ApiKeyRoleEntityFixture,
    ]),
    TypeOrmExtModule.forFeature({
      [ROLE_MODULE_ROLE_ENTITY_KEY]: {
        entity: RoleEntityFixture,
      },
      [ROLE_MODULE_USER_ROLE_ENTITY_KEY]: {
        entity: UserRoleEntityFixture,
      },
      [ROLE_MODULE_API_KEY_ROLE_ENTITY_KEY]: {
        entity: ApiKeyRoleEntityFixture,
      },
    }),
    CrudModule.forRoot({}),
  ],
  controllers: [RoleControllerFixture, UserRoleAssignmentControllerFixture],
  providers: [
    RoleTypeOrmCrudAdapterFixture,
    RoleCrudServiceFixture,
    UserRoleAssignmentTypeOrmCrudAdapterFixture,
    UserRoleAssignmentCrudServiceFixture,
    ApiKeyAssignmentTypeOrmCrudAdapterFixture,
    ApiKeyAssignmentCrudServiceFixture,
  ],
})
export class AppModuleCrudFixture {}
