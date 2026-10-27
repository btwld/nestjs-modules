import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when an entity's data source is a database this driver
 * cannot translate queries for.
 */
export class TypeOrmUnsupportedDatabaseException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    entityName: string;
    database: string;
  };

  constructor(
    entityName: string,
    database: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        '%s uses a "%s" data source, which TypeOrmRepository does not ' +
        'support. It supports SQL databases only',
      messageParams: [entityName, database],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, entityName, database };
    this.errorCode = 'TYPEORM_UNSUPPORTED_DATABASE';
  }
}
