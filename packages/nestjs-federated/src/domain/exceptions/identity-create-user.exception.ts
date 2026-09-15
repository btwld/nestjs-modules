import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

import { FederatedException } from './federated.exception.js';

export class IdentityCreateUserException extends FederatedException {
  declare context: RuntimeException['context'] & {
    entityName: string;
  };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Error while trying to create a %s reference',
      messageParams: [entityName],
      fault: 'internal',
      ...options,
    });

    this.context = {
      ...this.context,
      entityName,
    };

    this.errorCode = 'FEDERATED_IDENTITY_CREATE_USER_ERROR';
  }
}
