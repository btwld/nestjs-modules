import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { type RepositoryDatabaseErrorInterface } from '../repository/interfaces/repository-database-error.interface.js';

import { RepositoryQueryException } from './repository-query.exception.js';

/**
 * Exception thrown when the database raised an error during a repository
 * call, carrying what the driver reported about it: the database, its own
 * error code and its message, for logs and diagnosis.
 */
export class RepositoryDatabaseException extends RepositoryQueryException {
  declare context: RepositoryQueryException['context'] & {
    database: string;
    code?: string | number;
  };

  constructor(
    entityName: string,
    error: RepositoryDatabaseErrorInterface,
    options?: RuntimeExceptionOptions,
  ) {
    super(entityName, {
      message: 'The %s database failed a query on the %s repository: %s',
      messageParams: [error.database, entityName, error.message],
      ...options,
    });

    this.context = {
      ...this.context,
      database: error.database,
      code: error.code,
    };
    this.errorCode = 'REPOSITORY_DATABASE_ERROR';
  }
}
