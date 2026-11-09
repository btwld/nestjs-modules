import { DynamicModule, Module } from '@nestjs/common';

import {
  PasswordAsyncOptions,
  PasswordModuleClass,
  PasswordOptions,
  createPasswordImports,
  createPasswordProviders,
  createPasswordExports,
} from './password.module-definition.js';

@Module({})
export class PasswordModule extends PasswordModuleClass {
  static register(options: PasswordOptions): DynamicModule {
    return super.register(options);
  }

  static registerAsync(options: PasswordAsyncOptions): DynamicModule {
    return super.registerAsync(options);
  }

  static forRoot(options: PasswordOptions): DynamicModule {
    return super.register({ ...options, global: true });
  }

  static forRootAsync(options: PasswordAsyncOptions): DynamicModule {
    return super.registerAsync({ ...options, global: true });
  }

  static forFeature(options: PasswordOptions): DynamicModule {
    return {
      module: PasswordModule,
      imports: createPasswordImports(),
      providers: createPasswordProviders({ options }),
      exports: createPasswordExports(),
    };
  }
}
