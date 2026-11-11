import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { createSettingsProvider } from '@concepta/nestjs-core';

import {
  CRUD_MODULE_SETTINGS_TOKEN,
  CRUD_REQUEST_POLICY_TOKEN,
  CRUD_ROOT_REQUEST_POLICY_TOKEN,
} from './crud.constants.js';
import { crudDefaultConfig } from './infrastructure/config/crud-default.config.js';
import { type CrudModuleOptionsExtrasInterface } from './infrastructure/config/interfaces/crud-module-options-extras.interface.js';
import { type CrudModuleOptionsInterface } from './infrastructure/config/interfaces/crud-module-options.interface.js';
import { type CrudModuleSettingsInterface } from './infrastructure/config/interfaces/crud-module-settings.interface.js';
import { CrudContextOverlay } from './infrastructure/interceptors/crud-context.overlay.js';
import { CrudAllowAllPolicy } from './infrastructure/policies/crud-allow-all.policy.js';
import { type CrudRequestPolicyInterface } from './infrastructure/policies/interfaces/crud-request-policy.interface.js';
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
  const { global = false, imports } = extras;

  return {
    ...definition,
    global,
    imports: createCrudImports({ imports }),
    providers: [
      ...createCrudProviders({ providers }),
      ...(global ? [createCrudRootRequestPolicyProvider()] : []),
    ],
    exports: [
      ConfigModule,
      RAW_OPTIONS_TOKEN,
      ...createCrudExports(),
      ...(global ? [CRUD_ROOT_REQUEST_POLICY_TOKEN] : []),
    ],
  };
}

/** The policy `forRoot()` was given, for every module registering CRUD. */
function createCrudRootRequestPolicyProvider(): Provider {
  return {
    provide: CRUD_ROOT_REQUEST_POLICY_TOKEN,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: (options: CrudModuleOptionsInterface) =>
      options.requestPolicy ?? new CrudAllowAllPolicy(),
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

export function createCrudExports() {
  return [
    CRUD_MODULE_SETTINGS_TOKEN,
    CRUD_REQUEST_POLICY_TOKEN,
    CrudContextOverlay,
    CrudMetaview,
    CrudAdapterResolver,
    CrudOperationResolver,
  ];
}

export function createCrudProviders(options: {
  providers?: Provider[];
}): Provider[] {
  const { providers = [] } = options;

  return [
    ...providers,
    CrudContextOverlay,
    CrudMetaview,
    CrudAdapterResolver,
    CrudOperationResolver,
    createCrudSettingsProvider(),
    // A module's own policy, else the root's — injected, so it is built
    // first — and only with neither does every request run.
    {
      provide: CRUD_REQUEST_POLICY_TOKEN,
      inject: [
        RAW_OPTIONS_TOKEN,
        { token: CRUD_ROOT_REQUEST_POLICY_TOKEN, optional: true },
      ],
      useFactory: (
        options: CrudModuleOptionsInterface,
        root?: CrudRequestPolicyInterface,
      ) => options.requestPolicy ?? root ?? new CrudAllowAllPolicy(),
    },
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
