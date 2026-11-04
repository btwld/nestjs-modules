/** The database the MySQL adapter is for. */
export const DRIZZLE_MYSQL_DATABASE = 'mysql';

/** Prefixes the MySQL adapter's transaction keys. */
export const DRIZZLE_MYSQL_TRANSACTION_KEY_PREFIX = 'drizzle-mysql';

/**
 * MySQL's error numbers after which the server has rolled the whole
 * transaction back: a deadlock, and a lock table that ran out of memory.
 */
export const MYSQL_TRANSACTION_ENDED_ERRNOS: readonly unknown[] = [1213, 1206];

/**
 * MySQL's error numbers for a row it refuses to insert as given, before it
 * looks for a duplicate key: a `NOT NULL` column left out (1364) or given
 * `NULL` (1048), a value too long (1406), out of range (1264), of the wrong
 * kind (1366, 1292), a reference to no row (1452), or a failed check (3819;
 * MariaDB's 4025).
 */
export const MYSQL_UNINSERTABLE_ROW_ERRNOS: readonly unknown[] = [
  1364, 1048, 1406, 1264, 1366, 1292, 1452, 3819, 4025,
];
