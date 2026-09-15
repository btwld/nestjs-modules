import { HttpStatus } from '@nestjs/common';

import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

import { FederatedException } from './federated.exception.js';

export class IdentityUserRelationshipException extends FederatedException {
  declare context: RuntimeException['context'] & {
    identityId: string;
  };

  constructor(identityId: string, options?: RuntimeExceptionOptions) {
    super({
      // A stored federated identity whose `user` relation is null/missing is
      // a dangling reference in our own data (broken FK, missing eager
      // load) — the caller presented a valid identity, so this isn't their
      // mistake.
      message: 'Error while trying to load user relationship from identity %s',
      messageParams: [identityId],
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      fault: 'internal',
      ...options,
    });

    this.errorCode = 'FEDERATED_IDENTITY_USER_RELATIONSHIP_ERROR';

    this.context = {
      ...this.context,
      identityId,
    };
  }
}
