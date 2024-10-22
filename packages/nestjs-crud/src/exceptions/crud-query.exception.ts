import {
  RuntimeException,
  RuntimeExceptionOptions,
} from '@concepta/nestjs-exception';

export class CrudQueryException extends RuntimeException {
  context: RuntimeException['context'] & {
    entityName: string;
  };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Error while trying to query the %s entity',
      messageParams: [entityName],
      ...options,
    });

    this.context = {
      ...super.context,
      entityName,
    };

    this.errorCode = 'CRUD_QUERY_ERROR';
  }
}
