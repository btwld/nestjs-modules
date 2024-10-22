import { RuntimeExceptionOptions } from '@concepta/nestjs-exception';
import { ReferenceMutateException } from '@concepta/typeorm-common';

export class FederatedMutateCreateUserException extends ReferenceMutateException {
  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super(entityName, {
      message: 'Error while trying to mutate a %s reference',
      ...options,
    });

    this.errorCode = 'FEDERATED_MUTATE_CREATE_USER_ERROR';
  }
}
