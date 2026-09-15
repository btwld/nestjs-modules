import { DynamicModule, Module } from '@nestjs/common';

import {
  CoreAsyncOptions,
  CoreModuleClass,
  CoreOptions,
} from './core.module-definition.js';

@Module({})
export class CoreModule extends CoreModuleClass {
  static register(options: CoreOptions): DynamicModule {
    return super.register(options);
  }

  static registerAsync(options: CoreAsyncOptions): DynamicModule {
    return super.registerAsync(options);
  }

  static forRoot(options: CoreOptions = {}): DynamicModule {
    return super.register({ ...options, global: true });
  }

  static forRootAsync(options: CoreAsyncOptions): DynamicModule {
    return super.registerAsync({ ...options, global: true });
  }
}
