import { Module, Provider } from '@nestjs/common';

import { DynamicRepositoryModule } from '@concepta/nestjs-repository';

import { TypeOrmProviderOptionsInterface } from './repository/typeorm-provider-options.interface.js';
import { TypeOrmDriverOptionsInterface } from './typeorm-driver-options.interface.js';
import {
  createTypeOrmProvider,
  getTypeOrmImports,
  createTransactionFactoryDescriptor,
  resolveDataSourceName,
} from './typeorm-repository.util.js';

/**
 * TypeORM repository driver, registered through `RepositoryModule.forRoot()`.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     TypeOrmModule.forRoot({ ... }),
 *     RepositoryModule.forRoot({
 *       drivers: [
 *         {
 *           driver: TypeOrmRepositoryModule,
 *           entities: [
 *             { key: 'orders', entity: Order },
 *             { key: 'customers', entity: Customer, dataSource: 'secondary' },
 *             { key: 'audit', entity: AuditLog, factory: createAuditRepository },
 *           ],
 *         },
 *       ],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class TypeOrmRepositoryModule {
  /**
   * Build the repository providers for TypeORM entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   *
   * @param entities - Entity options
   * @param options - Driver options, from the registration's `options`
   * @returns Dynamic module with repository providers and transaction factory descriptors
   */
  static register(
    entities: TypeOrmProviderOptionsInterface[],
    options?: TypeOrmDriverOptionsInterface,
  ): DynamicRepositoryModule {
    // Get imports
    const imports = getTypeOrmImports(entities);

    // Collect unique data source names for transaction factory descriptors
    const dataSourceNames = new Set<string>();
    for (const entity of entities) {
      dataSourceNames.add(resolveDataSourceName(entity.dataSource));
    }

    // Create providers for entities
    const providers: Provider[] = entities.map((entityOption) =>
      createTypeOrmProvider(entityOption),
    );

    // Create transaction factory descriptors for RepositoryModule to register
    const transactionFactories = Array.from(dataSourceNames).map((dsName) =>
      createTransactionFactoryDescriptor(dsName, options),
    );

    return {
      module: TypeOrmRepositoryModule,
      imports,
      providers,
      transactionFactories,
    };
  }
}
