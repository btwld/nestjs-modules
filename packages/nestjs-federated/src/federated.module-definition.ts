import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';

import { createSettingsProvider } from '@concepta/nestjs-core';

import { CreateIdentityHandler } from './application/commands/handlers/create-identity.handler.js';
import { FindIdentityByProviderHandler } from './application/queries/handlers/find-identity-by-provider.handler.js';
import { FederatedUserPort } from './domain/ports/federated-user.port.js';
import { FederatedOAuthService } from './domain/services/federated-oauth.service.js';
import {
  FEDERATED_MODULE_DEFAULT_ENTITY_KEY,
  FEDERATED_MODULE_SETTINGS_TOKEN,
} from './federated.constants.js';
import { federatedDefaultConfig } from './infrastructure/config/federated-default.config.js';
import { type FederatedSettingsInterface } from './infrastructure/config/interfaces/federated-settings.interface.js';
import { IdentityMapper } from './infrastructure/persistence/identity.mapper.js';
import { createIdentityRepositoryProvider } from './infrastructure/utils/create-identity-repository-provider.js';
import { type FederatedOptionsExtrasInterface } from './interfaces/federated-options-extras.interface.js';
import { type FederatedOptionsInterface } from './interfaces/federated-options.interface.js';

const RAW_OPTIONS_TOKEN = Symbol('__FEDERATED_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: FederatedModuleClass,
  OPTIONS_TYPE: FEDERATED_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: FEDERATED_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<FederatedOptionsInterface>({
  moduleName: 'Federated',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<FederatedOptionsExtrasInterface>(
    {
      global: false,
      entities: { identity: FEDERATED_MODULE_DEFAULT_ENTITY_KEY },
    },
    definitionTransform,
  )
  .build();

export type FederatedOptions = Omit<typeof FEDERATED_OPTIONS_TYPE, 'global'>;

export type FederatedAsyncOptions = Omit<
  typeof FEDERATED_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: FederatedOptionsExtrasInterface,
): DynamicModule {
  const { imports = [], providers = [] } = definition;
  const { global = false, entities, repositories } = extras;
  const entityKey = entities?.identity ?? FEDERATED_MODULE_DEFAULT_ENTITY_KEY;

  return {
    ...definition,
    global,
    imports: createFederatedImports({ imports }),
    providers: createFederatedProviders({
      providers,
      entityKey,
      repositories,
    }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createFederatedExports()],
  };
}

export function createFederatedImports(options: {
  imports: DynamicModule['imports'];
}): DynamicModule['imports'] {
  return [
    ...(options.imports || []),
    ConfigModule.forFeature(federatedDefaultConfig),
    CqrsModule.forRoot(),
  ];
}

export function createFederatedExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [
    FEDERATED_MODULE_SETTINGS_TOKEN,
    FederatedOAuthService,
    IdentityMapper,
  ];
}

export function createFederatedProviders(options: {
  overrides?: FederatedOptions;
  providers?: Provider[];
  entityKey: string;
  repositories?: FederatedOptionsExtrasInterface['repositories'];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    FederatedOAuthService,
    createFederatedSettingsProvider(options.overrides),
    ...createIdentityRepositoryProvider(
      options.entityKey,
      options.repositories?.identity,
    ),
    createFederatedUserPortProvider(),
    IdentityMapper,
    // command handlers
    CreateIdentityHandler,
    // query handlers
    FindIdentityByProviderHandler,
  ];
}

export function createFederatedSettingsProvider(
  optionsOverrides?: FederatedOptions,
): Provider {
  return createSettingsProvider<
    FederatedSettingsInterface,
    FederatedOptionsInterface
  >({
    settingsToken: FEDERATED_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: federatedDefaultConfig.KEY,
    optionsOverrides,
  });
}

function createFederatedUserPortProvider(): Provider {
  return {
    provide: FederatedUserPort,
    inject: [RAW_OPTIONS_TOKEN, QueryBus, CommandBus],
    useFactory: (
      options: FederatedOptionsInterface,
      queryBus: QueryBus,
      commandBus: CommandBus,
    ) => new FederatedUserPort(options.userPort, queryBus, commandBus),
  };
}
