import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { createSettingsProvider } from '@concepta/nestjs-core';

import { ACCESS_CONTROL_MODULE_SETTINGS_TOKEN } from './access-control.constants.js';
import { AccessRulesInvalidException } from './domain/exceptions/access-rules-invalid.exception.js';
import { AccessControlService } from './domain/services/access-control.service.js';
import { accessGrantsProblems } from './domain/utils/access-rule-problems.util.js';
import { AccessContextOverlay } from './gateways/access-context.overlay.js';
import { AccessCtxDecisionSource } from './gateways/access-ctx-decision.source.js';
import { ActorCtxResolver } from './gateways/actor-ctx.resolver.js';
import { AccessControlFilter } from './gateways/http/access-control.filter.js';
import { AccessControlGuard } from './gateways/http/access-control.guard.js';
import { accessControlDefaultConfig } from './infrastructure/config/access-control-default.config.js';
import { type AccessControlOptionsExtrasInterface } from './infrastructure/config/interfaces/access-control-options-extras.interface.js';
import { type AccessControlOptionsInterface } from './infrastructure/config/interfaces/access-control-options.interface.js';
import { type AccessControlSettingsInterface } from './infrastructure/config/interfaces/access-control-settings.interface.js';
import { StaticAccessGrantsProvider } from './infrastructure/grants/static-access-grants.provider.js';

const RAW_OPTIONS_TOKEN = Symbol('__ACCESS_CONTROL_MODULE_RAW_OPTIONS_TOKEN__');

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

function definitionTransform(
  definition: DynamicModule,
  extras: AccessControlOptionsExtrasInterface,
): DynamicModule {
  const { providers = [] } = definition;
  const { global = false, queryServices = [] } = extras;
  // `register` passes its imports as an extra; `registerAsync` puts them on
  // the definition, for the options factory to inject from.
  const imports = [...(definition.imports ?? []), ...(extras.imports ?? [])];

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
  const imports = [ConfigModule.forFeature(accessControlDefaultConfig)];

  if (overrides?.imports?.length) {
    return [...imports, ...overrides.imports];
  } else {
    return imports;
  }
}

export function createAccessControlExports() {
  return [
    ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
    AccessControlService,
    AccessControlFilter,
    AccessControlGuard,
  ];
}

/**
 * The module's providers. `appWide: false` leaves out the global response
 * filter and actor overlay, for a feature module: a feature's options must
 * not decide for the whole application.
 */
export function createAccessControlProviders(options: {
  overrides?: AccessControlOptions;
  providers?: Provider[];
  appWide?: boolean;
}): Provider[] {
  const { appWide = true } = options;

  return [
    ...(options.providers ?? []),
    createAccessControlSettingsProvider(options.overrides),
    createAccessControlServiceProvider(options.overrides),
    ...(appWide
      ? [
          createAccessControlAppFilterProvider(options.overrides),
          createAccessControlContextOverlayProvider(options.overrides),
        ]
      : []),
    AccessControlFilter,
    AccessControlGuard,
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

/**
 * Builds the service from the options' actor resolver, grants provider and
 * authority. Without a grants provider, the settings' grants are used, and
 * invalid grants fail startup.
 */
export function createAccessControlServiceProvider(
  optionsOverrides?: AccessControlOptions,
): Provider {
  return {
    provide: AccessControlService,
    inject: [RAW_OPTIONS_TOKEN, ACCESS_CONTROL_MODULE_SETTINGS_TOKEN],
    useFactory: (
      options: AccessControlOptionsInterface,
      settings: AccessControlSettingsInterface,
    ) => {
      // A call's ActorCtx overlay wins; the options' resolver decides
      // without one.
      const actorResolver = new ActorCtxResolver(
        optionsOverrides?.actorResolver ?? options.actorResolver,
      );

      const grantsProvider =
        optionsOverrides?.grantsProvider ?? options.grantsProvider;
      const authority = optionsOverrides?.authority ?? options.authority;

      if (grantsProvider) {
        return new AccessControlService(
          actorResolver,
          grantsProvider,
          new AccessCtxDecisionSource(),
          authority,
        );
      }

      const grants = settings.grants ?? {};
      const problems = accessGrantsProblems(grants);

      if (problems.length) {
        throw new AccessRulesInvalidException(problems);
      }

      return new AccessControlService(
        actorResolver,
        new StaticAccessGrantsProvider(grants),
        new AccessCtxDecisionSource(),
        authority,
      );
    },
  };
}

/**
 * With an actor resolver, registers the overlay that defines `ActorCtx` on
 * every HTTP call, so routes without a grant have an actor too.
 */
export function createAccessControlContextOverlayProvider(
  optionsOverrides?: AccessControlOptions,
): Provider {
  return {
    provide: APP_INTERCEPTOR,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: (options: AccessControlOptionsInterface) => {
      const actorResolver =
        optionsOverrides?.actorResolver ?? options.actorResolver;

      return actorResolver ? new AccessContextOverlay(actorResolver) : null;
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
      const appFilter = optionsOverrides?.appFilter ?? options.appFilter;

      if (appFilter === false) {
        return null;
      } else {
        return appFilter ?? defaultFilter;
      }
    },
  };
}
