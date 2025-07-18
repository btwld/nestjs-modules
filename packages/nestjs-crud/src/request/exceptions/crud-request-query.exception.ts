import { RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { CrudException } from '../../exceptions/crud.exception';

export class CrudRequestQueryException extends CrudException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
  }
}
