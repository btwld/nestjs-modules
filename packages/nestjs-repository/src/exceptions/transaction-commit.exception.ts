import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { type RepositoryDatabaseErrorInterface } from '../repository/interfaces/repository-database-error.interface.js';

import { RepositoryDatabaseException } from './repository-database.exception.js';

/**
 * Exception thrown when the database refused to commit a run's
 * transaction, for example over a reference it checks at commit. None of
 * the run's writes were kept. `context.database` and `context.code` say
 * what the database reported, as for any `RepositoryDatabaseException`.
 */
export class TransactionCommitException extends RepositoryDatabaseException {
  constructor(
    error: RepositoryDatabaseErrorInterface,
    options?: RuntimeExceptionOptions,
  ) {
    super('', error, {
      message: 'The %s database refused to commit the transaction: %s',
      messageParams: [error.database, error.message],
      ...options,
    });

    this.errorCode = 'TRANSACTION_COMMIT_REFUSED';
  }
}
