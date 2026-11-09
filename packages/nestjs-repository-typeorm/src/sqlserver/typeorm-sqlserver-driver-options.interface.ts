import { type TypeOrmSqlServerSessionContextResolver } from './typeorm-sqlserver-session-context-resolver.type.js';

/**
 * Options for the SQL Server adapter, given as `options` on its
 * `RepositoryModule.forRoot()` registration.
 */
export interface TypeOrmSqlServerDriverOptionsInterface {
  /**
   * Values set in the session context for every transaction the driver
   * opens, with the transaction's id under
   * `TYPEORM_SQLSERVER_TRANSACTION_ID_KEY`.
   */
  sessionContext?: TypeOrmSqlServerSessionContextResolver;
}
