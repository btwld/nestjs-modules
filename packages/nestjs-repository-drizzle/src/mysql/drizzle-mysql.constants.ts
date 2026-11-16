/** The database the MySQL adapter is for. */
export const DRIZZLE_MYSQL_DATABASE = 'mysql';

/** Prefixes the MySQL adapter's transaction keys. */
export const DRIZZLE_MYSQL_TRANSACTION_KEY_PREFIX = 'drizzle-mysql';

/**
 * MySQL's error numbers after which the server has rolled the whole
 * transaction back: a deadlock, and a lock table that ran out of memory.
 */
export const MYSQL_TRANSACTION_ENDED_ERRNOS: readonly unknown[] = [1213, 1206];
