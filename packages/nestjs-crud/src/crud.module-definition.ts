import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { createSettingsProvider } from '@concepta/nestjs-core';

import {
  CRUD_DEFAULT_RESOLVER_TOKEN,
  CRUD_MODULE_SETTINGS_TOKEN,
} from './crud.constants.js';
import { crudDefaultConfig } from './infrastructure/config/crud-default.config.js';
import { type CrudModuleOptionsExtrasInterface } from './infrastructure/config/interfaces/crud-module-options-extras.interface.js';
import { type CrudModuleOptionsInterface } from './infrastructure/config/interfaces/crud-module-options.interface.js';
import { type CrudModuleSettingsInterface } from './infrastructure/config/interfaces/crud-module-settings.interface.js';
import { CrudContextOverlay } from './infrastructure/interceptors/crud-context.overlay.js';
import { CrudAdapterResolver } from './infrastructure/resolvers/crud-adapter.resolver.js';
import { CrudOperationResolver } from './infrastructure/resolvers/crud-operation.resolver.js';
import { CrudMetaview } from './infrastructure/services/crud-metaview.service.js';

const RAW_OPTIONS_TOKEN = Symbol('__CRUD_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: CrudModuleClass,
  OPTIONS_TYPE: CRUD_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: CRUD_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<CrudModuleOptionsInterface>({
  moduleName: 'Crud',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<CrudModuleOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type CrudOptions = Omit<typeof CRUD_OPTIONS_TYPE, 'global'>;
export type CrudAsyncOptions = Omit<typeof CRUD_ASYNC_OPTIONS_TYPE, 'global'>;

function definitionTransform(
  definition: DynamicModule,
  extras: CrudModuleOptionsExtrasInterface,
): DynamicModule {
  const { providers = [] } = definition;
  const { global = false, imports, defaultResolver } = extras;

  return {
    ...definition,
    global,
    imports: createCrudImports({ imports }),
    providers: createCrudProviders({ providers, defaultResolver }),
    exports: [
      ConfigModule,
      RAW_OPTIONS_TOKEN,
      ...createCrudExports({ defaultResolver }),
    ],
  };
}

export function createCrudImports(
  overrides?: CrudOptions,
): DynamicModule['imports'] {
  const imports = [ConfigModule.forFeature(crudDefaultConfig)];

  if (overrides?.imports?.length) {
    return [...imports, ...overrides.imports];
  } else {
    return imports;
  }
}

export function createCrudExports(options?: {
  defaultResolver?: CrudModuleOptionsExtrasInterface['defaultResolver'];
}) {
  const resolverClass = options?.defaultResolver ?? CrudAdapterResolver;

  return [
    CRUD_MODULE_SETTINGS_TOKEN,
    CrudContextOverlay,
    CrudMetaview,
    CrudAdapterResolver,
    CrudOperationResolver,
    CRUD_DEFAULT_RESOLVER_TOKEN,
    resolverClass,
  ];
}

export function createCrudProviders(options: {
  providers?: Provider[];
  defaultResolver?: CrudModuleOptionsExtrasInterface['defaultResolver'];
}): Provider[] {
  const { providers = [], defaultResolver } = options;

  const resolverClass = defaultResolver ?? CrudAdapterResolver;

  return [
    ...providers,
    CrudContextOverlay,
    CrudMetaview,
    CrudAdapterResolver,
    CrudOperationResolver,
    resolverClass,
    {
      provide: CRUD_DEFAULT_RESOLVER_TOKEN,
      useExisting: resolverClass,
    },
    createCrudSettingsProvider(),
    { provide: APP_INTERCEPTOR, useClass: CrudContextOverlay },
  ];
}

export function createCrudSettingsProvider(
  optionsOverrides?: CrudOptions,
): Provider {
  return createSettingsProvider<
    CrudModuleSettingsInterface,
    CrudModuleOptionsInterface
  >({
    settingsToken: CRUD_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: crudDefaultConfig.KEY,
    optionsOverrides,
  });
}
