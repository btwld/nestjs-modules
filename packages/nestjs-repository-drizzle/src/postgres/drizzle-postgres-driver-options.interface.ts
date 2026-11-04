import { type DrizzlePostgresTransactionSettingsResolver } from './drizzle-postgres-transaction-settings-resolver.type.js';

/**
 * Options for the Postgres adapter, given as `options` on its
 * `RepositoryModule.forRoot()` registration.
 */
export interface DrizzlePostgresDriverOptionsInterface {
  /** Settings applied at the start of every transaction the driver opens. */
  transactionSettings?: DrizzlePostgresTransactionSettingsResolver;
}
