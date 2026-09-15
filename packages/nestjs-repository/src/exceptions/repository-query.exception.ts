import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

export class RepositoryQueryException extends RuntimeException {
  declare context: RuntimeException['context'] & { entityName: string };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Error while trying to query the %s repository',
      messageParams: [entityName],
      fault: 'internal',
      ...options,
    });

    this.context = { ...this.context, entityName };
    this.errorCode = 'REPOSITORY_QUERY_ERROR';
  }
}
