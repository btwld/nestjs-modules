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
    entityName: string;
    database: string;
    accepted: string;
  };

  /**
   * @param entityName - The entity registered on the data source
   * @param database - The data source's database type
   * @param accepted - The database type the adapter is for
   */
  constructor(
    entityName: string,
    database: string,
    accepted: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        'Entity %s uses a "%s" data source, but its TypeORM adapter is for "%s"',
      messageParams: [entityName, database, accepted],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, entityName, database, accepted };
    this.errorCode = 'TYPEORM_UNSUPPORTED_DATABASE';
  }
}
