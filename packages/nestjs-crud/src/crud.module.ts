import { DynamicModule, Module, PlainLiteralObject } from '@nestjs/common';

import {
  CrudAsyncOptions,
  CrudModuleClass,
  CrudOptions,
} from './crud.module-definition.js';
import { CrudModuleForFeatureOptionsInterface } from './infrastructure/config/interfaces/crud-module-for-feature-options.interface.js';
import { ConfigurableCrudBuilder } from './infrastructure/utils/configurable-crud.builder.js';

@Module({})
export class CrudModule extends CrudModuleClass {
  static register(options: CrudOptions): DynamicModule {
    return super.register(options);
  }

  static registerAsync(options: CrudAsyncOptions): DynamicModule {
    return super.registerAsync(options);
  }

  static forRoot(options: CrudOptions): DynamicModule {
    return super.register({ ...options, global: true });
  }

  static forRootAsync(options: CrudAsyncOptions): DynamicModule {
    return super.registerAsync({ ...options, global: true });
  }

  static forFeature<Entity extends PlainLiteralObject = PlainLiteralObject>(
    options: CrudModuleForFeatureOptionsInterface<Entity>,
  ): DynamicModule {
    const builder = new ConfigurableCrudBuilder<Entity>(options.crud);
    const { providers, controllers } = builder.build();

    return {
      module: CrudModule,
      providers,
      exports: providers,
      controllers: Object.values(controllers),
    };
  }
}
