import { Module, DynamicModule, Provider } from '@nestjs/common';

import { RepositoryBootException } from './exceptions/repository-boot.exception.js';
import { RepositoryDriverInterface } from './interfaces/repository-module.interface.js';
import {
  RepositoryRootAsyncOptions,
  RepositoryRootOptions,
} from './interfaces/repository-root-options.interface.js';
import { REPOSITORY_BINDING, RepositoryBinding } from './repository-binding.js';
import { REPOSITORY_MODULE_OPTIONS } from './repository.constants.js';
import { createRepositoryRootModule } from './repository.module-definition.js';
import { getDynamicRepositoryToken } from './utils/get-dynamic-repository-token.js';

/**
 * Repository module providing data access abstraction with transaction support.
 *
 * Register every entity once, in `forRoot()`, and import `forFeature()` with
 * the keys a module injects.
 *
 * @example
 * ```typescript
 * // app.module.ts
 * @Module({
 *   imports: [
 *     TypeOrmModule.forRoot({ ... }),
 *     RepositoryModule.forRoot({
 *       drivers: [
 *         {
 *           driver: TypeOrmRepositoryModule,
 *           entities: [
 *             { key: 'orders', entity: Order },
 *             { key: 'customers', entity: Customer },
 *           ],
 *         },
 *       ],
 *     }),
 *     OrdersModule,
 *   ],
 * })
 * export class AppModule {}
 *
 * // orders.module.ts
 * @Module({
 *   imports: [RepositoryModule.forFeature(['orders', 'customers'])],
 *   providers: [OrdersService],
 * })
 * export class OrdersModule {}
 * ```
 */
@Module({})
export class RepositoryModule {
  /**
   * Register every entity in the application, grouped by driver.
   *
   * Binds each repository to its declarations and runs the startup checks
   * while the application is created; a failure stops it there.
   */
  static forRoot<const Drivers extends readonly RepositoryDriverInterface[]>(
    options: RepositoryRootOptions<Drivers>,
  ): DynamicModule {
    const { drivers = [], imports = [], ...moduleOptions } = options;

    return createRepositoryRootModule({
      module: RepositoryModule,
      drivers,
      imports,
      optionsProvider: {
        provide: REPOSITORY_MODULE_OPTIONS,
        useValue: moduleOptions,
      },
    });
  }

  /**
   * {@link RepositoryModule.forRoot}, with the module options built by a
   * factory. Entities stay static.
   */
  static forRootAsync<
    const Drivers extends readonly RepositoryDriverInterface[],
  >(options: RepositoryRootAsyncOptions<Drivers>): DynamicModule {
    const { drivers = [], imports = [], inject = [], useFactory } = options;

    return createRepositoryRootModule({
      module: RepositoryModule,
      drivers,
      imports,
      optionsProvider: {
        provide: REPOSITORY_MODULE_OPTIONS,
        inject,
        useFactory,
      },
    });
  }

  /**
   * Make repositories registered in `forRoot()` injectable in this module,
   * under their keys.
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [RepositoryModule.forFeature(['orders'])],
   *   providers: [OrdersService], // @InjectDynamicRepository('orders')
   * })
   * export class OrdersModule {}
   * ```
   */
  static forFeature(keys: string[]): DynamicModule {
    const providers: Provider[] = keys.map((key) => ({
      provide: getDynamicRepositoryToken(key),
      // Required, not optional: Nest turns any failure resolving an optional
      // dependency into `undefined`, which would hide why the binding failed.
      inject: [REPOSITORY_BINDING],
      useFactory: (binding: RepositoryBinding) => {
        const repo = binding.get(key);
        if (!repo) {
          throw new RepositoryBootException([
            `RepositoryModule.forFeature() asks for "${key}", which is not ` +
              'registered in RepositoryModule.forRoot().',
          ]);
        }
        return repo;
      },
    }));

    return {
      module: RepositoryModule,
      providers,
      exports: keys.map((key) => getDynamicRepositoryToken(key)),
    };
  }
}
