import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';

import { createSettingsProvider } from '@concepta/nestjs-core';

import { ArchiveCacheHandler } from './application/commands/handlers/archive-cache.handler.js';
import { ClearCachesByAssigneeHandler } from './application/commands/handlers/clear-caches-by-assignee.handler.js';
import { CreateCacheHandler } from './application/commands/handlers/create-cache.handler.js';
import { RemoveCacheHandler } from './application/commands/handlers/remove-cache.handler.js';
import { ReplaceCacheHandler } from './application/commands/handlers/replace-cache.handler.js';
import { UpdateCacheHandler } from './application/commands/handlers/update-cache.handler.js';
import { UpsertCacheHandler } from './application/commands/handlers/upsert-cache.handler.js';
import { FindCachesByAssigneeHandler } from './application/queries/handlers/find-caches-by-assignee.handler.js';
import { FindOneCacheHandler } from './application/queries/handlers/find-one-cache.handler.js';
import { GetCacheHandler } from './application/queries/handlers/get-cache.handler.js';
import {
  CACHE_CUSTOM_REPOSITORY_TOKEN,
  CACHE_MODULE_SETTINGS_TOKEN,
  CACHE_REPOSITORY_RESOLVER_TOKEN,
} from './cache.constants.js';
import { CacheExpirationPolicy } from './domain/policies/cache-expiration.policy.js';
import { CacheContextOverlay } from './gateways/cache-context.overlay.js';
import { cacheDefaultConfig } from './infrastructure/config/cache-default.config.js';
import { type CacheExtrasInterface } from './infrastructure/config/interfaces/cache-extras.interface.js';
import { type CacheOptionsInterface } from './infrastructure/config/interfaces/cache-options.interface.js';
import { type CacheSettingsInterface } from './infrastructure/config/interfaces/cache-settings.interface.js';
import { CacheRepositoryResolver } from './infrastructure/persistence/cache-repository.resolver.js';
import { CacheMapper } from './infrastructure/persistence/cache.mapper.js';
import { createCacheExpirationPolicyProvider } from './infrastructure/utils/create-cache-expiration-policy-provider.js';

const RAW_OPTIONS_TOKEN = Symbol('__CACHE_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: CacheCoreModuleClass,
  OPTIONS_TYPE: CACHE_CORE_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: CACHE_CORE_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<CacheOptionsInterface>({
  moduleName: 'CacheCore',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<CacheExtrasInterface>({ global: true }, definitionTransform)
  .build();

export type CacheCoreOptions = typeof CACHE_CORE_OPTIONS_TYPE;
export type CacheCoreAsyncOptions = typeof CACHE_CORE_ASYNC_OPTIONS_TYPE;

function definitionTransform(
  definition: DynamicModule,
  { global, providers: overrideProviders, repositories }: CacheExtrasInterface,
): DynamicModule {
  const { providers = [], imports = [] } = definition;

  return {
    ...definition,
    global,
    imports: createCacheImports({ imports }),
    providers: createCacheProviders({
      providers: [...providers, ...(overrideProviders ?? [])],
      repositories,
    }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createCacheExports()],
  };
}

export function createCacheImports(options: {
  imports: DynamicModule['imports'];
}): DynamicModule['imports'] {
  return [
    ...(options.imports || []),
    ConfigModule.forFeature(cacheDefaultConfig),
    CqrsModule.forRoot(),
  ];
}

export function createCacheProviders(options: {
  overrides?: CacheCoreOptions;
  providers?: Provider[];
  repositories?: CacheExtrasInterface['repositories'];
}): Provider[] {
  return [
    createCacheSettingsProvider(options.overrides),
    createCacheExpirationPolicyProvider(),
    CacheMapper,
    {
      provide: CACHE_CUSTOM_REPOSITORY_TOKEN,
      useValue: options.repositories?.cache ?? null,
    },
    {
      provide: CACHE_REPOSITORY_RESOLVER_TOKEN,
      useClass: CacheRepositoryResolver,
    },
    UpsertCacheHandler,
    ClearCachesByAssigneeHandler,
    CreateCacheHandler,
    UpdateCacheHandler,
    RemoveCacheHandler,
    ReplaceCacheHandler,
    ArchiveCacheHandler,
    GetCacheHandler,
    FindOneCacheHandler,
    FindCachesByAssigneeHandler,
    { provide: APP_INTERCEPTOR, useClass: CacheContextOverlay },
    ...(options.providers ?? []),
  ];
}

export function createCacheExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [CACHE_MODULE_SETTINGS_TOKEN, CacheExpirationPolicy, CacheMapper];
}

export function createCacheSettingsProvider(
  optionsOverrides?: CacheCoreOptions,
): Provider {
  return createSettingsProvider<CacheSettingsInterface, CacheOptionsInterface>({
    settingsToken: CACHE_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: cacheDefaultConfig.KEY,
    optionsOverrides,
  });
}
