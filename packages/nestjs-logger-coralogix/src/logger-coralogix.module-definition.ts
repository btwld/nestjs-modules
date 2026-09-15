import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { createSettingsProvider } from '@concepta/nestjs-common';

import {
  LOGGER_CORALOGIX_MODULE_SETTINGS_TOKEN,
  coralogixConfig,
} from './config/logger-coralogix.config';
import { type CoralogixOptionsExtrasInterface } from './interfaces/logger-coralogix-options-extras.interface';
import { type CoralogixOptionsInterface } from './interfaces/logger-coralogix-options.interface';
import { type LoggerCoralogixSettingsInterface } from './interfaces/logger-coralogix-settings.interface';
import { LoggerCoralogixTransport } from './transports/logger-coralogix.transport';

const RAW_OPTIONS_TOKEN = Symbol(
  '__LOGGER_CORALOGIX_MODULE_RAW_OPTIONS_TOKEN__',
);

export const {
  ConfigurableModuleClass: CoralogixModuleClass,
  OPTIONS_TYPE: LOGGER_CORALOGIX_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: LOGGER_CORALOGIX_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<CoralogixOptionsInterface>({
  moduleName: 'LoggerCoralogix',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<CoralogixOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type CoralogixOptions = Omit<
  typeof LOGGER_CORALOGIX_OPTIONS_TYPE,
  'global'
>;
export type CoralogixAsyncOptions = Omit<
  typeof LOGGER_CORALOGIX_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: CoralogixOptionsExtrasInterface,
): DynamicModule {
  const { providers = [] } = definition;
  const { global = false } = extras;

  return {
    ...definition,
    global,
    imports: createLoggerCoralogixImports(),
    providers: createLoggerCoralogixProviders({ providers }),
    exports: [
      ConfigModule,
      RAW_OPTIONS_TOKEN,
      ...createLoggerCoralogixExports(),
    ],
  };
}

export function createLoggerCoralogixImports(): DynamicModule['imports'] {
  return [ConfigModule.forFeature(coralogixConfig)];
}

export function createLoggerCoralogixProviders(overrides: {
  options?: CoralogixOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(overrides.providers ?? []),
    LoggerCoralogixTransport,
    createLoggerCoralogixSettingsProvider(overrides.options),
  ];
}

export function createLoggerCoralogixExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [LOGGER_CORALOGIX_MODULE_SETTINGS_TOKEN, LoggerCoralogixTransport];
}

export function createLoggerCoralogixSettingsProvider(
  optionsOverrides?: CoralogixOptions,
): Provider {
  return createSettingsProvider<
    LoggerCoralogixSettingsInterface,
    CoralogixOptionsInterface
  >({
    settingsToken: LOGGER_CORALOGIX_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: coralogixConfig.KEY,
    optionsOverrides,
  });
}
