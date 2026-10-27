import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';

import {
  createCorrelationFeatureExports,
  createCorrelationFeatureProviders,
} from './infrastructure/context/utils/create-correlation-feature-providers.js';
import {
  createHookFeatureExports,
  createHookFeatureProviders,
} from './infrastructure/hook/utils/create-hook-feature-providers.js';

const CORE_MODULE_RAW_OPTIONS_TOKEN = Symbol(
  '__CORE_MODULE_RAW_OPTIONS_TOKEN__',
);

export interface CoreOptionsInterface {
  // Reserved for future feature options
}

export interface CoreOptionsExtrasInterface {
  global?: boolean;
}

export const {
  ConfigurableModuleClass: CoreModuleClass,
  OPTIONS_TYPE: CORE_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: CORE_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<CoreOptionsInterface>({
  moduleName: 'Core',
  optionsInjectionToken: CORE_MODULE_RAW_OPTIONS_TOKEN,
})
  .setExtras<CoreOptionsExtrasInterface>({ global: true }, definitionTransform)
  .build();

export type CoreOptions = Omit<typeof CORE_OPTIONS_TYPE, 'global'>;
export type CoreAsyncOptions = Omit<typeof CORE_ASYNC_OPTIONS_TYPE, 'global'>;

function definitionTransform(
  definition: DynamicModule,
  extras: CoreOptionsExtrasInterface,
): DynamicModule {
  const { providers = [] } = definition;
  const { global = true } = extras;

  return {
    ...definition,
    global,
    providers: createCoreProviders({ providers }),
    exports: [CORE_MODULE_RAW_OPTIONS_TOKEN, ...createCoreExports()],
  };
}

export function createCoreProviders(options: {
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    // Hook feature
    ...createHookFeatureProviders(),
    // Correlation feature
    ...createCorrelationFeatureProviders(),
  ];
}

export function createCoreExports(): NonNullable<DynamicModule['exports']> {
  return [
    // Hook feature
    ...createHookFeatureExports(),
    // Correlation feature
    ...createCorrelationFeatureExports(),
  ];
}
