import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { createSettingsProvider } from '@concepta/nestjs-common';

import {
  LOGGER_SENTRY_MODULE_SETTINGS_TOKEN,
  loggerSentryConfig,
} from './config/logger-sentry.config';
import { type LoggerSentryOptionsExtrasInterface } from './interfaces/logger-sentry-options-extras.interface';
import { type LoggerSentryOptionsInterface } from './interfaces/logger-sentry-options.interface';
import { type LoggerSentrySettingsInterface } from './interfaces/logger-sentry-settings.interface';
import { LoggerSentryTransport } from './transports/logger-sentry.transport';

const RAW_OPTIONS_TOKEN = Symbol('__LOGGER_SENTRY_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: LoggerSentryModuleClass,
  OPTIONS_TYPE: LOGGER_SENTRY_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: LOGGER_SENTRY_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<LoggerSentryOptionsInterface>({
  moduleName: 'LoggerSentry',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<LoggerSentryOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type LoggerSentryOptions = Omit<
  typeof LOGGER_SENTRY_OPTIONS_TYPE,
  'global'
>;
export type LoggerSentryAsyncOptions = Omit<
  typeof LOGGER_SENTRY_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: LoggerSentryOptionsExtrasInterface,
): DynamicModule {
  const { providers = [] } = definition;
  const { global = false } = extras;

  return {
    ...definition,
    global,
    imports: createLoggerSentryImports(),
    providers: createLoggerSentryProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createLoggerSentryExports()],
  };
}

export function createLoggerSentryImports(): DynamicModule['imports'] {
  return [ConfigModule.forFeature(loggerSentryConfig)];
}

export function createLoggerSentryProviders(overrides: {
  options?: LoggerSentryOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(overrides.providers ?? []),
    LoggerSentryTransport,
    createLoggerSentrySettingsProvider(overrides.options),
  ];
}

export function createLoggerSentryExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [LOGGER_SENTRY_MODULE_SETTINGS_TOKEN, LoggerSentryTransport];
}

export function createLoggerSentrySettingsProvider(
  optionsOverrides?: LoggerSentryOptions,
): Provider {
  return createSettingsProvider<
    LoggerSentrySettingsInterface,
    LoggerSentryOptionsInterface
  >({
    settingsToken: LOGGER_SENTRY_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: loggerSentryConfig.KEY,
    optionsOverrides,
  });
}
