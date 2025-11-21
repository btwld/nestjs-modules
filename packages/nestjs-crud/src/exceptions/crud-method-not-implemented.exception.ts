import { Type } from '@nestjs/common';

import { RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { CrudException } from './crud.exception';

/**
 * Crud method not implemented exception.
 */
export class CrudMethodNotImplementedException<
  T extends Type = Type,
> extends CrudException {
  constructor(
    instance: InstanceType<T>,
    method: CallableFunction,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: `CRUD controller "%s" method "%s" not implemented`,
      messageParams: [instance.constructor.name, method.name],
      ...options,
    });
    this.errorCode = 'CRUD_METHOD_NOT_IMPLEMENTED_ERROR';
  }
}
