import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when an adapter is given a data source of a database it
 * is not for, e.g. a SQLite data source registered with the Postgres
 * adapter.
 */
export class TypeOrmUnsupportedDatabaseException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    subject: string;
    database: string;
    accepted: readonly string[];
  };

  /**
   * @param subject - What was given the data source, e.g. `'Entity Post'`
   *   or `'Data source "default"'`
   * @param database - The data source's database type
   * @param accepted - The database types the adapter accepts
   */
  constructor(
    subject: string,
    database: string,
    accepted: readonly string[],
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        '%s uses a "%s" data source, but its TypeORM adapter accepts only %s',
      messageParams: [
        subject,
        database,
        accepted.map((type) => `"${type}"`).join(', '),
      ],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, subject, database, accepted };
    this.errorCode = 'TYPEORM_UNSUPPORTED_DATABASE';
  }
}
