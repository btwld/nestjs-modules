import { HttpStatus } from '@nestjs/common';

import {
  ReferenceIdInterface,
  RuntimeException,
  RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

import { FederatedException } from './federated.exception';

export class FederatedFindUserException extends FederatedException {
  context: RuntimeException['context'] & {
    entityName: string;
    user: ReferenceIdInterface;
  };

  constructor(
    entityName: string,
    user: ReferenceIdInterface,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Error while trying find user %s',
      messageParams: [user.id],
      httpStatus: HttpStatus.NOT_FOUND,
      ...options,
    });

    this.errorCode = 'FEDERATED_FIND_USER_ERROR';

    this.context = {
      ...super.context,
      entityName,
      user,
    };
  }
}
