import { DynamicModule, Module } from '@nestjs/common';

import {
  FederatedAsyncOptions,
  FederatedModuleClass,
  FederatedOptions,
} from './federated.module-definition.js';

@Module({})
export class FederatedModule extends FederatedModuleClass {
  static register(options: FederatedOptions): DynamicModule {
    return super.register(options);
  }

  static registerAsync(options: FederatedAsyncOptions): DynamicModule {
    return super.registerAsync(options);
  }

  static forRoot(options: FederatedOptions): DynamicModule {
    return super.register({ ...options, global: true });
  }

  static forRootAsync(options: FederatedAsyncOptions): DynamicModule {
    return super.registerAsync({ ...options, global: true });
  }
}
