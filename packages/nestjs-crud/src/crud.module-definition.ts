import {
  ConfigurableModuleBuilder,
  DynamicModule,
  Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { createSettingsProvider } from '@concepta/nestjs-common';

import { crudDefaultConfig } from './config/crud-default.config';
import { CRUD_MODULE_SETTINGS_TOKEN } from './crud.constants';
import { CrudModuleOptionsExtrasInterface } from './interfaces/crud-module-options-extras.interface';
import { CrudModuleOptionsInterface } from './interfaces/crud-module-options.interface';
import { CrudModuleSettingsInterface } from './interfaces/crud-module-settings.interface';
import { CrudReflectionService } from './services/crud-reflection.service';

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
    providers: createCrudProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createCrudExports()],
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
  return [CRUD_MODULE_SETTINGS_TOKEN, CrudReflectionService];
}

export function createCrudProviders(options: {
  overrides?: CrudOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    CrudReflectionService,
    createCrudSettingsProvider(options.overrides),
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
