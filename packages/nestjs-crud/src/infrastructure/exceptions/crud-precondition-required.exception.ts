import { HttpStatus } from '@nestjs/common';

import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

import { CrudException } from './crud.exception.js';

/**
 * Thrown when a route requires an `If-Match` precondition
 * (`@CrudRequireVersion()`) and the request did not carry one naming a
 * version. `If-Match: *` does not satisfy it — it states no version at
 * all, which is exactly the blind write the flag exists to forbid.
 */
export class CrudPreconditionRequiredException extends CrudException {
  declare context: RuntimeException['context'] & { entityName: string };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message:
        'An If-Match header naming a version is required for %s — ' +
        'read the current resource and retry with its version',
      messageParams: [entityName],
      httpStatus: HttpStatus.PRECONDITION_REQUIRED,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, entityName };
    this.errorCode = 'CRUD_PRECONDITION_REQUIRED';
  }
}
