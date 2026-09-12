import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreModule, UseHooks, Operation } from '@concepta/nestjs-core';
import { CrudCqrsResolver, CrudModule } from '@concepta/nestjs-crud';
import {
  CreatePasswordCommand,
  PasswordModule,
  PasswordUpdateInterface,
  ValidateCurrentPasswordCommand,
  ValidatePasswordHistoryCommand,
} from '@concepta/nestjs-password';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { UserCredentialEntityFixture } from '../../../../__tests__/fixtures/entities/user-credential.entity.fixture.js';
import { UserEntityFixture } from '../../../../__tests__/fixtures/entities/user.entity.fixture.js';
import { ormConfig } from '../../../../__tests__/fixtures/ormconfig.fixture.js';
import { UserInterface } from '../../../../domain/interfaces/user.interface.js';
import { userPasswordUpdateSchema } from '../../../../infrastructure/schemas/password/user-password-update.schema.js';
import { userCreateSchema } from '../../../../infrastructure/schemas/user-create.schema.js';
import { userPaginatedSchema } from '../../../../infrastructure/schemas/user-paginated.schema.js';
import { userUpdateSchema } from '../../../../infrastructure/schemas/user-update.schema.js';
import { userSchema } from '../../../../infrastructure/schemas/user.schema.js';
import { UserModule } from '../../../../user.module.js';
import { CreateUserRequestHandler } from '../../commands/handlers/create-user-request.handler.js';
import { DeleteUserRequestHandler } from '../../commands/handlers/delete-user-request.handler.js';
import { UpdateUserPasswordRequestHandler } from '../../commands/handlers/update-user-password-request.handler.js';
import { UpdateUserRequestHandler } from '../../commands/handlers/update-user-request.handler.js';
import { CreateUserRequest } from '../../commands/impl/create-user.request.js';
import { DeleteUserRequest } from '../../commands/impl/delete-user.request.js';
import { UpdateUserPasswordRequest } from '../../commands/impl/update-user-password.request.js';
import { UpdateUserRequest } from '../../commands/impl/update-user.request.js';
import { ListUsersRequestHandler } from '../../queries/handlers/list-users-request.handler.js';
import { ReadUserRequestHandler } from '../../queries/handlers/read-user-request.handler.js';
import { ListUsersRequest } from '../../queries/impl/list-users.request.js';
import { ReadUserRequest } from '../../queries/impl/read-user.request.js';

import { AuthorizedUserOverlayFixture } from './authorized-user.local.fixture.js';
import { FakeAuthInterceptorFixture } from './fake-auth.interceptor.fixture.js';
import { UserScopeHookFixture } from './user-scope.hook.fixture.js';

const USER_ENTITY_KEY_FIXTURE = 'user';
const USER_CREDENTIALS_ENTITY_KEY_FIXTURE = 'user-credentials';

@Module({
  imports: [
    TypeOrmModule.forRoot(ormConfig),
    CqrsModule.forRoot(),
    RepositoryModule.forRoot({}),
    CrudModule.forRoot({
      defaultResolver: CrudCqrsResolver,
    }),
    CoreModule.forRoot(),
    PasswordModule.forRoot({}),
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        { key: USER_ENTITY_KEY_FIXTURE, entity: UserEntityFixture },
        {
          key: USER_CREDENTIALS_ENTITY_KEY_FIXTURE,
          entity: UserCredentialEntityFixture,
        },
      ],
    }),
    UserModule.forRoot({
      entities: {
        user: USER_ENTITY_KEY_FIXTURE,
        credentials: USER_CREDENTIALS_ENTITY_KEY_FIXTURE,
      },
      ports: {
        password: {
          createCommand: CreatePasswordCommand,
          validateCurrentCommand: ValidateCurrentPasswordCommand,
          validateHistoryCommand: ValidatePasswordHistoryCommand,
        },
      },
    }),
    CrudModule.forFeature<UserInterface>({
      crud: {
        controller: {
          entity: USER_ENTITY_KEY_FIXTURE,
          path: 'user',
          resolver: CrudCqrsResolver,
          transactional: true,
          request: { body: userCreateSchema },
          response: {
            resource: userSchema,
            paginated: userPaginatedSchema,
          },
        },
        operations: [
          {
            operation: Operation.List,
            query: ListUsersRequest,
            queryHandler: ListUsersRequestHandler,
          },
          {
            operation: Operation.Read,
            query: ReadUserRequest,
            queryHandler: ReadUserRequestHandler,
          },
          {
            operation: Operation.Create,
            request: { body: userCreateSchema },
            command: CreateUserRequest,
            commandHandler: CreateUserRequestHandler,
          },
          {
            operation: Operation.Update,
            request: { body: userUpdateSchema },
            command: UpdateUserRequest,
            commandHandler: UpdateUserRequestHandler,
          },
          {
            operation: Operation.Delete,
            command: DeleteUserRequest,
            commandHandler: DeleteUserRequestHandler,
          },
        ],
      },
    }),
    CrudModule.forFeature<PasswordUpdateInterface>({
      crud: {
        controller: {
          entity: USER_ENTITY_KEY_FIXTURE,
          path: 'password',
          resolver: CrudCqrsResolver,
          transactional: true,
          request: { body: userPasswordUpdateSchema },
          response: { resource: userSchema },
          extraDecorators: [UseHooks(UserScopeHookFixture)],
        },
        operations: [
          {
            operation: Operation.Update,
            request: { body: userPasswordUpdateSchema },
            command: UpdateUserPasswordRequest,
            commandHandler: UpdateUserPasswordRequestHandler,
          },
        ],
      },
    }),
  ],
  providers: [
    UserScopeHookFixture,
    FakeAuthInterceptorFixture,
    {
      provide: APP_INTERCEPTOR,
      useExisting: FakeAuthInterceptorFixture,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthorizedUserOverlayFixture,
    },
  ],
})
export class AppModuleCrudFixture {}
