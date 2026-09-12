import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule, QueryBus } from '@nestjs/cqrs';

import { createSettingsProvider } from '@concepta/nestjs-core';

import {
  ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
  ACCESS_CONTROL_PORT_TOKEN,
} from './access-control.constants.js';
import {
  AccessControlPort,
  type AccessControlPortSettings,
} from './application/ports/access-control.port.js';
import { CheckAccessHandler } from './application/queries/handlers/check-access.handler.js';
import { FilterResponseAttributesHandler } from './application/queries/handlers/filter-response-attributes.handler.js';
import { ResolveUserRolesHandler } from './application/queries/handlers/resolve-user-roles.handler.js';
import { CheckAccessQuery } from './application/queries/impl/check-access.query.js';
import { FilterResponseAttributesQuery } from './application/queries/impl/filter-response-attributes.query.js';
import { ResolveUserRolesQuery } from './application/queries/impl/resolve-user-roles.query.js';
import { AccessControlFilter } from './gateways/http/access-control.filter.js';
import { AccessControlGuard } from './gateways/http/access-control.guard.js';
import { accessControlDefaultConfig } from './infrastructure/config/access-control-default.config.js';
import { type AccessControlOptionsExtrasInterface } from './infrastructure/config/interfaces/access-control-options-extras.interface.js';
import { type AccessControlOptionsInterface } from './infrastructure/config/interfaces/access-control-options.interface.js';
import { type AccessControlSettingsInterface } from './infrastructure/config/interfaces/access-control-settings.interface.js';
import { AccessControlService } from './infrastructure/services/access-control.service.js';

const RAW_OPTIONS_TOKEN = Symbol('__ACCESS_CONTROL_MODULE_RAW_OPTIONS_TOKEN__');

export const DEFAULT_ACCESS_CONTROL_PORT_SETTINGS: Required<AccessControlPortSettings> =
  {
    checkAccessQuery: CheckAccessQuery,
    filterResponseAttributesQuery: FilterResponseAttributesQuery,
    resolveUserRolesQuery: ResolveUserRolesQuery,
  };

export const {
  ConfigurableModuleClass: AccessControlModuleClass,
  OPTIONS_TYPE: ACCESS_CONTROL_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: ACCESS_CONTROL_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<AccessControlOptionsInterface>({
  moduleName: 'AccessControl',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<AccessControlOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type AccessControlOptions = Omit<
  typeof ACCESS_CONTROL_OPTIONS_TYPE,
  'global'
>;

export type AccessControlAsyncOptions = Omit<
  typeof ACCESS_CONTROL_ASYNC_OPTIONS_TYPE,
  'global'
>;

const ACCESS_CONTROL_QUERY_HANDLERS = [
  CheckAccessHandler,
  FilterResponseAttributesHandler,
  ResolveUserRolesHandler,
];

function definitionTransform(
  definition: DynamicModule,
  extras: AccessControlOptionsExtrasInterface,
): DynamicModule {
  const { providers = [] } = definition;
  const { global = false, imports, queryServices = [] } = extras;

  return {
    ...definition,
    global,
    imports: createAccessControlImports({ imports }),
    providers: createAccessControlProviders({
      providers: [...providers, ...queryServices],
    }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createAccessControlExports()],
  };
}

export function createAccessControlImports(
  overrides?: Pick<AccessControlOptions, 'imports'>,
): DynamicModule['imports'] {
  const imports = [
    CqrsModule,
    ConfigModule.forFeature(accessControlDefaultConfig),
  ];

  if (overrides?.imports?.length) {
    return [...imports, ...overrides.imports];
  } else {
    return imports;
  }
}

export function createAccessControlExports() {
  return [
    ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
    ACCESS_CONTROL_PORT_TOKEN,
    AccessControlService,
    AccessControlFilter,
    AccessControlGuard,
  ];
}

export function createAccessControlProviders(options: {
  overrides?: AccessControlOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    createAccessControlSettingsProvider(options.overrides),
    createAccessControlServiceProvider(options.overrides),
    createAccessControlPortProvider(options.overrides),
    createAccessControlAppGuardProvider(options.overrides),
    createAccessControlAppFilterProvider(options.overrides),
    AccessControlFilter,
    AccessControlGuard,
    ...ACCESS_CONTROL_QUERY_HANDLERS,
  ];
}

export function createAccessControlSettingsProvider(
  optionsOverrides?: AccessControlOptions,
): Provider {
  return createSettingsProvider<
    AccessControlSettingsInterface,
    AccessControlOptionsInterface
  >({
    settingsToken: ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: accessControlDefaultConfig.KEY,
    optionsOverrides,
  });
}

export function createAccessControlServiceProvider(
  optionsOverrides?: AccessControlOptions,
): Provider {
  return {
    provide: AccessControlService,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: (options: AccessControlOptionsInterface) =>
      optionsOverrides?.service ??
      options.service ??
      new AccessControlService(),
  };
}

export function createAccessControlPortProvider(
  optionsOverrides?: AccessControlOptions,
): Provider {
  return {
    provide: ACCESS_CONTROL_PORT_TOKEN,
    inject: [RAW_OPTIONS_TOKEN, QueryBus],
    useFactory: (
      options: AccessControlOptionsInterface,
      queryBus: QueryBus,
    ) => {
      const portSettings: Required<AccessControlPortSettings> = {
        ...DEFAULT_ACCESS_CONTROL_PORT_SETTINGS,
        ...options?.ports?.accessControl,
        ...optionsOverrides?.ports?.accessControl,
      };
      return new AccessControlPort(portSettings, queryBus);
    },
  };
}

export function createAccessControlAppGuardProvider(
  optionsOverrides?: AccessControlOptions,
): Provider {
  return {
    provide: APP_GUARD,
    inject: [RAW_OPTIONS_TOKEN, AccessControlGuard],
    useFactory: (
      options: AccessControlOptionsInterface,
      defaultGuard: AccessControlGuard,
    ) => {
      const appGuard = optionsOverrides?.appGuard ?? options?.appGuard;

      if (appGuard === false) {
        return null;
      } else {
        return appGuard ?? defaultGuard;
      }
    },
  };
}

export function createAccessControlAppFilterProvider(
  optionsOverrides?: AccessControlOptions,
): Provider {
  return {
    provide: APP_INTERCEPTOR,
    inject: [RAW_OPTIONS_TOKEN, AccessControlFilter],
    useFactory: (
      options: AccessControlOptionsInterface,
      defaultFilter: AccessControlFilter,
    ) => {
      const appFilter = optionsOverrides?.appFilter ?? options?.appFilter;

      if (appFilter === false) {
        return null;
      } else {
        return appFilter ?? defaultFilter;
      }
    },
  };
}
