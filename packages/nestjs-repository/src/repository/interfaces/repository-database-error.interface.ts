/**
 * What a driver reports about an error its database raised.
 */
export interface RepositoryDatabaseErrorInterface {
  /** The database, as the driver names it. */
  database: string;
  /** The database's own error code, when it gives one. */
  code?: string | number;
  /** The database's message. */
  message: string;
}
