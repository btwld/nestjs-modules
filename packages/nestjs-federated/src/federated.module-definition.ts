import {
  ConfigurableModuleBuilder,
  DynamicModule,
  Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { createSettingsProvider } from '@concepta/nestjs-common';

import {
  FEDERATED_MODULE_SETTINGS_TOKEN,
  FEDERATED_MODULE_USER_LOOKUP_SERVICE_TOKEN,
  FEDERATED_MODULE_USER_MUTATE_SERVICE_TOKEN,
} from './federated.constants';

import { FederatedOptionsInterface } from './interfaces/federated-options.interface';
import { FederatedEntitiesOptionsInterface } from './interfaces/federated-entities-options.interface';
import { FederatedOptionsExtrasInterface } from './interfaces/federated-options-extras.interface';
import { FederatedSettingsInterface } from './interfaces/federated-settings.interface';
import { FederatedService } from './services/federated.service';
import { FederatedOAuthService } from './services/federated-oauth.service';
import { FederatedMutateService } from './services/federated-mutate.service';
import { federatedDefaultConfig } from './config/federated-default.config';
import { FederatedMissingEntitiesOptionsException } from './exceptions/federated-missing-entities-options.exception';

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
    { global: false },
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
  const { providers = [] } = definition;
  const { global = false, entities } = extras;

  if (!entities) {
    throw new FederatedMissingEntitiesOptionsException();
  }

  return {
    ...definition,
    global,
    imports: createFederatedImports({ entities }),
    providers: createFederatedProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createFederatedExports()],
  };
}

export function createFederatedImports(
  options: FederatedEntitiesOptionsInterface,
): DynamicModule['imports'] {
  return [
    ConfigModule.forFeature(federatedDefaultConfig),
    TypeOrmExtModule.forFeature(options.entities),
  ];
}

export function createFederatedExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [
    FEDERATED_MODULE_SETTINGS_TOKEN,
    FEDERATED_MODULE_USER_LOOKUP_SERVICE_TOKEN,
    FEDERATED_MODULE_USER_MUTATE_SERVICE_TOKEN,
    FederatedService,
    FederatedOAuthService,
    FederatedMutateService,
  ];
}

export function createFederatedProviders(options: {
  overrides?: FederatedOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    createFederatedSettingsProvider(options.overrides),
    createFederatedUserLookupServiceProvider(options.overrides),
    createFederatedUserMutateServiceProvider(options.overrides),
    FederatedService,
    FederatedOAuthService,
    FederatedMutateService,
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

export function createFederatedUserLookupServiceProvider(
  optionsOverrides?: FederatedOptions,
): Provider {
  return {
    provide: FEDERATED_MODULE_USER_LOOKUP_SERVICE_TOKEN,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: async (options: FederatedOptionsInterface) =>
      optionsOverrides?.userLookupService ?? options.userLookupService,
  };
}

export function createFederatedUserMutateServiceProvider(
  optionsOverrides?: FederatedOptions,
): Provider {
  return {
    provide: FEDERATED_MODULE_USER_MUTATE_SERVICE_TOKEN,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: async (options: FederatedOptionsInterface) =>
      optionsOverrides?.userMutateService ?? options.userMutateService,
  };
}
