/** The database type the MySQL adapter is for. */
export const TYPEORM_MYSQL_DATABASE = 'mysql';

/** Prefixes the MySQL adapter's transaction keys. */
export const TYPEORM_MYSQL_TRANSACTION_KEY_PREFIX = 'typeorm-mysql';

/**
 * MySQL's error numbers after which the server has rolled the whole
 * transaction back: a deadlock, and a lock table that ran out of memory.
 */
export const MYSQL_TRANSACTION_ENDED_ERRNOS: readonly number[] = [1213, 1206];
