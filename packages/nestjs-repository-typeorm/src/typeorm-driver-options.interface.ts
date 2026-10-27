import { type TypeOrmTransactionSettingsResolver } from './transaction/typeorm-transaction-settings-resolver.type.js';

/**
 * Options for the TypeORM driver, given as `options` on its
 * `RepositoryModule.forRoot()` registration.
 */
export interface TypeOrmDriverOptionsInterface {
  /**
   * Settings applied at the start of every transaction the driver opens.
   * Postgres only.
   */
  transactionSettings?: TypeOrmTransactionSettingsResolver;
}
