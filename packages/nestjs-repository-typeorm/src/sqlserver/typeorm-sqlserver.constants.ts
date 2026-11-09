/** The database type the SQL Server adapter is for. */
export const TYPEORM_SQLSERVER_DATABASE = 'mssql';

/** Prefixes the SQL Server adapter's transaction keys. */
export const TYPEORM_SQLSERVER_TRANSACTION_KEY_PREFIX = 'typeorm-sqlserver';

/**
 * The session context key holding the id of the transaction that set the
 * session context values. A row-level security predicate compares it with
 * `CURRENT_TRANSACTION_ID()`, so values left on a pooled connection match
 * nothing once their transaction has ended.
 */
export const TYPEORM_SQLSERVER_TRANSACTION_ID_KEY = 'rockets.transaction_id';
