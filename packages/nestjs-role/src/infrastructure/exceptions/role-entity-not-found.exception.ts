import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

import { RoleException } from '../../application/exceptions/role.exception.js';

export class RoleEntityNotFoundException extends RoleException {
  declare context: RuntimeException['context'] & { entityName: string };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Entity %s was not registered to be used.',
      messageParams: [entityName],
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'ROLE_ENTITY_NOT_FOUND_ERROR';

    this.context = {
      ...this.context,
      entityName,
    };
  }
}
