import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when an adapter is given a database on a single
 * connection, e.g. a node-postgres `Client` instead of a `Pool`. Every
 * transaction would run on that one connection, so one run's rollback
 * could undo another's committed writes.
 */
export class DrizzleSingleConnectionException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    connection: string;
  };

  /**
   * @param connection - The `@nestjs/drizzle` connection
   */
  constructor(connection: string, options?: RuntimeExceptionOptions) {
    super({
      message:
        'The Drizzle connection "%s" is a single connection: register a ' +
        'pool, so each transaction gets a connection of its own',
      messageParams: [connection],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, connection };
    this.errorCode = 'DRIZZLE_SINGLE_CONNECTION';
  }
}
