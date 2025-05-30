import { AccessControl } from 'accesscontrol';

import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '@concepta/nestjs-access-control';
import { AuthJwtModule } from '@concepta/nestjs-auth-jwt';
import { AuthenticationModule } from '@concepta/nestjs-authentication';
import { CrudModule } from '@concepta/nestjs-crud';
import { EventModule } from '@concepta/nestjs-event';
import { JwtModule } from '@concepta/nestjs-jwt';

import { UserAccessQueryService } from '../services/user-access-query.service';
import { UserResource } from '../user.types';

import { UserCrudControllerFixture } from './controllers/user-crud.controller.fixture';
import { ormConfig } from './ormconfig.fixture';
import { UserCrudModelServiceFixture } from './services/user-crud-model.service.fixture';
import { UserCrudServiceFixture } from './services/user-crud.service.fixture';
import { UserEntityFixture } from './user.entity.fixture';

const rules = new AccessControl();
rules
  .grant('user')
  .resource(UserResource.One)
  .createOwn()
  .readOwn()
  .updateOwn()
  .deleteOwn();

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot(ormConfig),
    TypeOrmModule.forFeature([UserEntityFixture]),
    CrudModule.forRoot({}),
    EventModule.forRoot({}),
    JwtModule.forRoot({}),
    AuthJwtModule.forRootAsync({
      inject: [UserCrudModelServiceFixture],
      useFactory: (userModelService: UserCrudModelServiceFixture) => ({
        userModelService,
      }),
    }),
    AuthenticationModule.forRoot({}),
    AccessControlModule.forRoot({
      settings: { rules },
      queryServices: [UserAccessQueryService],
    }),
  ],
  providers: [UserCrudModelServiceFixture, UserCrudServiceFixture],
  exports: [UserCrudModelServiceFixture, UserCrudServiceFixture],
  controllers: [UserCrudControllerFixture],
})
export class AppModuleCrudFixture {}
