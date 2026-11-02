import { type TypeOrmOracleApplicationContextInterface } from './typeorm-oracle-application-context.interface.js';

/**
 * Options for the Oracle adapter, given as `options` on its
 * `RepositoryModule.forRoot()` registration.
 */
export interface TypeOrmOracleDriverOptionsInterface {
  /**
   * Values set in an application context for every transaction the driver
   * opens, and cleared before its connection goes back to the pool.
   */
  applicationContext?: TypeOrmOracleApplicationContextInterface;
}
