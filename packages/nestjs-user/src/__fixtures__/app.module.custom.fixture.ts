import { AccessControl } from 'accesscontrol';
import { Module } from '@nestjs/common';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { PasswordModule } from '@concepta/nestjs-password';
import {
  AuthenticationModule,
  AuthJwtModule,
  JwtModule,
} from '@concepta/nestjs-authentication';
import { AccessControlModule } from '@concepta/nestjs-access-control';
import { CrudModule } from '@concepta/nestjs-crud';
import { EventModule } from '@concepta/nestjs-event';

import { UserModule } from '../user.module';
import { createUserRepositoryFixture } from './create-user-repository.fixture';
import { UserModuleCustomFixture } from './user.module.custom.fixture';
import { UserLookupCustomService } from './services/user-lookup.custom.service';
import { ormConfig } from './ormconfig.fixture';
import { UserEntityFixture } from './user.entity.fixture';
import { UserResource } from '../user.types';

const rules = new AccessControl();
rules
  .grant('user')
  .resource(UserResource.One)
  .createOwn()
  .readOwn()
  .updateOwn()
  .deleteOwn();

@Module({
  imports: [
    UserModuleCustomFixture,
    TypeOrmExtModule.forRoot(ormConfig),
    CrudModule.forRoot({}),
    EventModule.forRoot({}),
    JwtModule.forRoot({}),
    AuthJwtModule.forRootAsync({
      inject: [UserLookupCustomService],
      useFactory: (userLookupService: UserLookupCustomService) => ({
        userLookupService,
      }),
    }),
    AuthenticationModule.forRoot({}),
    PasswordModule.forRoot({}),
    AccessControlModule.forRoot({ settings: { rules } }),
    UserModule.forRootAsync({
      inject: [UserLookupCustomService],
      useFactory: async (userLookupService: UserLookupCustomService) => ({
        userLookupService,
        settings: {
          passwordHistory: {
            enabled: true,
          },
        },
      }),
      entities: {
        user: {
          entity: UserEntityFixture,
          repositoryFactory: createUserRepositoryFixture,
        },
      },
    }),
  ],
})
export class AppModuleCustomFixture {}
