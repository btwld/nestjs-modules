import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
  type Type,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';

import { createSettingsProvider } from '@concepta/nestjs-core';

import { CreateUserCredentialHandler } from './application/commands/handlers/create-user-credential.handler.js';
import { CreateUserHandler } from './application/commands/handlers/create-user.handler.js';
import { RemoveUserHandler } from './application/commands/handlers/remove-user.handler.js';
import { SetUserPasswordHandler } from './application/commands/handlers/set-user-password.handler.js';
import { UpdateUserCredentialHandler } from './application/commands/handlers/update-user-credential.handler.js';
import { UpdateUserPasswordHandler } from './application/commands/handlers/update-user-password.handler.js';
import { UpdateUserHandler } from './application/commands/handlers/update-user.handler.js';
import { GetUserByEmailHandler } from './application/queries/handlers/get-user-by-email.handler.js';
import { GetUserBySubjectHandler } from './application/queries/handlers/get-user-by-subject.handler.js';
import { GetUserByUsernameHandler } from './application/queries/handlers/get-user-by-username.handler.js';
import { GetUserHandler } from './application/queries/handlers/get-user.handler.js';
import { UserPasswordPort } from './domain/ports/user-password.port.js';
import { type UserCredentialsRepositoryInterface } from './domain/repositories/user-credentials-repository.interface.js';
import { UserCredentialsService } from './domain/services/user-credentials.service.js';
import { type UserExtrasInterface } from './infrastructure/config/interfaces/user-extras.interface.js';
import { type UserOptionsInterface } from './infrastructure/config/interfaces/user-options.interface.js';
import { type UserSettingsInterface } from './infrastructure/config/interfaces/user-settings.interface.js';
import { userDefaultConfig } from './infrastructure/config/user-default.config.js';
import { UserCredentialsMapper } from './infrastructure/persistence/user-credentials.mapper.js';
import { UserMapper } from './infrastructure/persistence/user.mapper.js';
import { createPasswordPolicyProvider } from './infrastructure/utils/create-password-policy-provider.js';
import { createUserCredentialsRepositoryProvider } from './infrastructure/utils/create-user-credentials-repository-provider.js';
import { createUserRepositoryProvider } from './infrastructure/utils/create-user-repository-provider.js';
import { USER_MODULE_SETTINGS_TOKEN } from './user.constants.js';

const RAW_OPTIONS_TOKEN = Symbol('__USER_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: UserModuleClass,
  OPTIONS_TYPE: USER_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: USER_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<UserOptionsInterface>({
  moduleName: 'User',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<UserExtrasInterface>(
    { global: false, entities: { user: 'user' } },
    definitionTransform,
  )
  .build();

export type UserOptions = typeof USER_OPTIONS_TYPE;
export type UserAsyncOptions = typeof USER_ASYNC_OPTIONS_TYPE;

function definitionTransform(
  definition: DynamicModule,
  {
    global,
    providers: overrideProviders,
    entities,
    repositories,
  }: UserExtrasInterface,
): DynamicModule {
  const { providers = [], imports = [] } = definition;

  return {
    ...definition,
    global,
    imports: createUserImports({ imports }),
    providers: createUserProviders({
      providers: [...providers, ...(overrideProviders ?? [])],
      entities,
      repositories,
    }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createUserExports()],
  };
}

export function createUserImports(options: {
  imports: DynamicModule['imports'];
}): DynamicModule['imports'] {
  return [
    ...(options.imports || []),
    ConfigModule.forFeature(userDefaultConfig),
    CqrsModule.forRoot(),
  ];
}

export function createUserProviders(options: {
  overrides?: UserOptions;
  providers?: Provider[];
  entities: UserExtrasInterface['entities'];
  repositories?: UserExtrasInterface['repositories'];
}): Provider[] {
  return [
    createUserSettingsProvider(options.overrides),
    UserMapper,
    // User repository
    ...createUserRepositoryProvider(
      options.entities.user,
      options.repositories?.user,
    ),
    // User CRUD command handlers
    CreateUserHandler,
    UpdateUserHandler,
    RemoveUserHandler,
    // Password command handlers (dispatch to credential commands via CommandBus)
    SetUserPasswordHandler,
    UpdateUserPasswordHandler,
    // User CRUD query handlers
    GetUserHandler,
    GetUserByEmailHandler,
    GetUserByUsernameHandler,
    GetUserBySubjectHandler,
    // Credentials infrastructure (only when credentials entity is configured)
    ...createUserCredentialProviders(
      options.entities.credentials,
      options.repositories?.userCredentials,
    ),
    // Consumer overrides (last provider for a token wins)
    ...(options.providers ?? []),
  ];
}

function createUserCredentialProviders(
  entityKey?: string,
  customRepository?: Type<UserCredentialsRepositoryInterface>,
): Provider[] {
  if (!entityKey && !customRepository) {
    return [];
  }

  return [
    createPasswordPolicyProvider(),
    createUserPasswordPortProvider(),
    UserCredentialsMapper,
    ...createUserCredentialsRepositoryProvider(entityKey, customRepository),
    CreateUserCredentialHandler,
    UpdateUserCredentialHandler,
    UserCredentialsService,
  ];
}

export function createUserExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [USER_MODULE_SETTINGS_TOKEN];
}

function createUserPasswordPortProvider(): Provider {
  return {
    provide: UserPasswordPort,
    inject: [RAW_OPTIONS_TOKEN, CommandBus],
    useFactory: (options: UserOptionsInterface, commandBus: CommandBus) => {
      if (!options.ports?.password) {
        throw new Error(
          'UserModule: ports.password is required when credentials entity is configured',
        );
      }
      return new UserPasswordPort(options.ports.password, commandBus);
    },
  };
}

export function createUserSettingsProvider(
  optionsOverrides?: UserOptions,
): Provider {
  return createSettingsProvider<UserSettingsInterface, UserOptionsInterface>({
    settingsToken: USER_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: userDefaultConfig.KEY,
    optionsOverrides,
  });
}
