import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  APP_FILTER,
  APP_INTERCEPTOR,
  type BaseExceptionFilter,
} from '@nestjs/core';

import { createSettingsProvider } from '@concepta/nestjs-common';

import {
  LOGGER_MODULE_SETTINGS_TOKEN,
  loggerConfig,
} from './config/logger.config';
import { type LoggerOptionsExtrasInterface } from './interfaces/logger-options-extras.interface';
import { type LoggerOptionsInterface } from './interfaces/logger-options.interface';
import { type LoggerSettingsInterface } from './interfaces/logger-settings.interface';
import { LoggerExceptionFilter } from './logger-exception.filter';
import { LoggerRequestInterceptor } from './logger-request.interceptor';
import { LoggerTransportService } from './logger-transport.service';
import { LoggerService } from './logger.service';

const RAW_OPTIONS_TOKEN = Symbol('__LOGGER_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: LoggerModuleClass,
  OPTIONS_TYPE: LOGGER_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: LOGGER_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<LoggerOptionsInterface>({
  moduleName: 'Logger',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<LoggerOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type LoggerOptions = Omit<typeof LOGGER_OPTIONS_TYPE, 'global'>;
export type LoggerAsyncOptions = Omit<
  typeof LOGGER_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: LoggerOptionsExtrasInterface,
): DynamicModule {
  const { providers = [] } = definition;
  const { global = false } = extras;

  return {
    ...definition,
    global,
    imports: createLoggerImports(),
    providers: createLoggerProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createLoggerExports()],
  };
}

export function createLoggerImports(): DynamicModule['imports'] {
  return [ConfigModule.forFeature(loggerConfig)];
}

export function createLoggerProviders(overrides: {
  options?: LoggerOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(overrides.providers ?? []),
    LoggerTransportService,
    LoggerRequestInterceptor,
    LoggerExceptionFilter,
    createLoggerSettingsProvider(overrides.options),
    createLoggerServiceProvider(overrides.options),
    createLoggerAppFilterProvider(overrides.options),
    createLoggerAppInterceptorProvider(),
  ];
}

export function createLoggerExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [LOGGER_MODULE_SETTINGS_TOKEN, LoggerService];
}

export function createLoggerSettingsProvider(
  optionsOverrides?: LoggerOptions,
): Provider {
  return createSettingsProvider<
    LoggerSettingsInterface,
    LoggerOptionsInterface
  >({
    settingsToken: LOGGER_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: loggerConfig.KEY,
    optionsOverrides,
  });
}

export function createLoggerServiceProvider(
  optionsOverrides?: LoggerOptions,
): Provider {
  return {
    provide: LoggerService,
    inject: [RAW_OPTIONS_TOKEN, LoggerTransportService],
    useFactory: async (
      options: LoggerOptionsInterface,
      loggerTransportService: LoggerTransportService,
    ) => {
      const transports = optionsOverrides?.transports ?? options.transports;

      transports?.forEach((transport) => {
        loggerTransportService.addTransport(transport);
      });

      return new LoggerService(loggerTransportService);
    },
  };
}

export function createLoggerAppFilterProvider(
  optionsOverrides?: LoggerOptions,
): Provider {
  return {
    provide: APP_FILTER,
    inject: [RAW_OPTIONS_TOKEN, LoggerExceptionFilter],
    useFactory: async (
      options: LoggerOptionsInterface,
      defaultService: BaseExceptionFilter,
    ) =>
      optionsOverrides?.exceptionFilter ??
      options.exceptionFilter ??
      defaultService,
  };
}

export function createLoggerAppInterceptorProvider(): Provider {
  return {
    provide: APP_INTERCEPTOR,
    useClass: LoggerRequestInterceptor,
  };
}
