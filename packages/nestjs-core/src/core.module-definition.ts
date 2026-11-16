import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { CORE_MODULE_RAW_OPTIONS_TOKEN } from './core.constants.js';
import {
  createCorrelationFeatureExports,
  createCorrelationFeatureProviders,
} from './infrastructure/context/utils/create-correlation-feature-providers.js';
import {
  createHookFeatureExports,
  createHookFeatureProviders,
} from './infrastructure/hook/utils/create-hook-feature-providers.js';
import { type RouteAuditSettingsInterface } from './infrastructure/route-audit/interfaces/route-audit-settings.interface.js';
import { createRouteAuditFeatureProviders } from './infrastructure/route-audit/utils/create-route-audit-feature-providers.js';

export interface CoreOptionsInterface {
  /**
   * Turns on the route audit, which checks every HTTP route against the
   * registered rules at startup. Off when left out.
   */
  routeAudit?: RouteAuditSettingsInterface;
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
  const { imports = [], providers = [] } = definition;
  const { global = true } = extras;

  return {
    ...definition,
    global,
    imports: [...imports, DiscoveryModule],
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
    // Route audit feature
    ...createRouteAuditFeatureProviders(),
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
