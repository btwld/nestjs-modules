import { DynamicModule, Module } from '@nestjs/common';

import {
  AccessControlAsyncOptions,
  AccessControlModuleClass,
  AccessControlOptions,
  createAccessControlExports,
  createAccessControlImports,
  createAccessControlProviders,
} from './access-control.module-definition.js';

@Module({})
export class AccessControlModule extends AccessControlModuleClass {
  static register(options: AccessControlOptions): DynamicModule {
    return super.register(options);
  }

  static registerAsync(options: AccessControlAsyncOptions): DynamicModule {
    return super.registerAsync(options);
  }

  static forRoot(options: AccessControlOptions): DynamicModule {
    return super.register({ ...options, global: true });
  }

  static forRootAsync(options: AccessControlAsyncOptions): DynamicModule {
    return super.registerAsync({ ...options, global: true });
  }

  static forFeature(options: AccessControlOptions): DynamicModule {
    return {
      module: AccessControlModule,
      imports: createAccessControlImports(options),
      providers: createAccessControlProviders({ overrides: options }),
      exports: createAccessControlExports(),
    };
  }
}
