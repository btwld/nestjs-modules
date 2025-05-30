import {
  RuntimeException,
  RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

import { FederatedException } from './federated.exception';

export class FederatedCreateUserException extends FederatedException {
  context: RuntimeException['context'] & {
    entityName: string;
  };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Error while trying to create a %s reference',
      messageParams: [entityName],
      ...options,
    });

    this.context = {
      ...super.context,
      entityName,
    };

    this.errorCode = 'FEDERATED_CREATE_USER_ERROR';
  }
}
