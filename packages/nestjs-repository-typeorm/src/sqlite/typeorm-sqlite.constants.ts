/** The database type the SQLite adapter is for. */
export const TYPEORM_SQLITE_DATABASE = 'better-sqlite3';

/** Prefixes the SQLite adapter's transaction keys. */
export const TYPEORM_SQLITE_TRANSACTION_KEY_PREFIX = 'typeorm-sqlite';

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
