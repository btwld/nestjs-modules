import { DynamicModule, Module } from '@nestjs/common';

import {
  AuthenticationAsyncOptions,
  AuthenticationModuleClass,
  AuthenticationOptions,
} from './authentication.module-definition.js';

/**
 * Authentication module
 */
@Module({})
export class AuthenticationModule extends AuthenticationModuleClass {
  static register(options: AuthenticationOptions): DynamicModule {
    return super.register(options);
  }

  static registerAsync(options: AuthenticationAsyncOptions): DynamicModule {
    return super.registerAsync(options);
  }

  static forRoot(options: AuthenticationOptions): DynamicModule {
    return super.register({ ...options, global: true });
  }

  static forRootAsync(options: AuthenticationAsyncOptions): DynamicModule {
    return super.registerAsync({ ...options, global: true });
  }
}
