/** The database the SQLite adapter is for. */
export const DRIZZLE_SQLITE_DATABASE = 'sqlite';

/** Prefixes the SQLite adapter's transaction keys. */
export const DRIZZLE_SQLITE_TRANSACTION_KEY_PREFIX = 'drizzle-sqlite';

/**
 * SQLite's primary error codes after which it may have rolled the whole
 * transaction back: a full database, an I/O error, a busy lock, out of
 * memory, or an interrupt.
 */
export const SQLITE_TRANSACTION_ENDED_CODES: readonly string[] = [
  'SQLITE_FULL',
  'SQLITE_IOERR',
  'SQLITE_BUSY',
  'SQLITE_NOMEM',
  'SQLITE_INTERRUPT',
];
