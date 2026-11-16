import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when an adapter is given a connection to a database it
 * is not for, e.g. a MySQL connection registered with the Postgres adapter.
 */
export class DrizzleUnsupportedDatabaseException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    connection: string;
    accepted: string;
  };

  /**
   * @param connection - The `@nestjs/drizzle` connection
   * @param accepted - The database the adapter is for
   */
  constructor(
    connection: string,
    accepted: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        'The Drizzle connection "%s" is not a "%s" database, which is what ' +
        'its adapter is for',
      messageParams: [connection, accepted],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, connection, accepted };
    this.errorCode = 'DRIZZLE_UNSUPPORTED_DATABASE';
  }
}
