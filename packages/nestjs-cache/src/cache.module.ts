import { DynamicModule, Module } from '@nestjs/common';

import {
  CacheCoreAsyncOptions,
  CacheCoreModuleClass,
  CacheCoreOptions,
} from './cache-core.module-definition.js';
import { createCacheRepositoryProvider } from './infrastructure/utils/create-cache-repository-provider.js';
type CacheOptions = Omit<CacheCoreOptions, 'global'>;
type CacheAsyncOptions = Omit<CacheCoreAsyncOptions, 'global'>;

/**
 * Cache Module
 */
@Module({})
export class CacheModule {
  static register(options: CacheOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: [CacheCoreModuleClass.register({ ...options, global: false })],
    };
  }

  static registerAsync(options: CacheAsyncOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: [
        CacheCoreModuleClass.registerAsync({ ...options, global: false }),
      ],
    };
  }

  static forRoot(options: CacheOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: [CacheCoreModuleClass.register({ ...options, global: true })],
    };
  }

  static forRootAsync(options: CacheAsyncOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: [
        CacheCoreModuleClass.registerAsync({ ...options, global: true }),
      ],
    };
  }

  static forFeature(entityKeys: string[]): DynamicModule {
    const providers = entityKeys.map((entityKey) =>
      createCacheRepositoryProvider(entityKey),
    );

    return {
      module: CacheModule,
      providers,
      exports: providers,
    };
  }
}
