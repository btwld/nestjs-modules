import { Module } from '@nestjs/common';

import { type DynamicRepositoryModule } from '@concepta/nestjs-repository';

import {
  createDrizzleProvider,
  createTransactionFactoryDescriptor,
  resolveConnectionName,
} from './drizzle-repository.util.js';
import { type DrizzleProviderOptionsInterface } from './repository/drizzle-provider-options.interface.js';

/**
 * Drizzle repository driver, registered through `RepositoryModule.forRoot()`.
 * Reads each connection's database from `@nestjs/drizzle`.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     DrizzleModule.forRoot({ drizzle, connection }),
 *     RepositoryModule.forRoot({
 *       drivers: [
 *         {
 *           driver: DrizzleRepositoryModule,
 *           entities: [
 *             { key: 'books', entity: Book, table: books, removeDate: 'removedAt' },
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
export class DrizzleRepositoryModule {
  /**
   * Build the repository providers for Drizzle entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   */
  static register(
    entities: DrizzleProviderOptionsInterface[],
  ): DynamicRepositoryModule {
    const connections = new Set(
      entities.map(({ connection }) => resolveConnectionName(connection)),
    );

    return {
      module: DrizzleRepositoryModule,
      providers: entities.map((entity) => createDrizzleProvider(entity)),
      transactionFactories: Array.from(connections).map((connection) =>
        createTransactionFactoryDescriptor(connection),
      ),
    };
  }
}
