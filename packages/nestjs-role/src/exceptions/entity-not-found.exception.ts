import { HttpStatus } from '@nestjs/common';
import {
  RuntimeException,
  RuntimeExceptionOptions,
} from '@concepta/nestjs-exception';

export class EntityNotFoundException extends RuntimeException {
  context: RuntimeException['context'] & { entityName: string };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Entity %s was not registered to be used.',
      messageParams: [entityName],
      httpStatus: HttpStatus.NOT_FOUND,
      ...options,
    });

    this.errorCode = 'ROLE_ENTITY_NOT_FOUND_ERROR';

    this.context = {
      ...super.context,
      entityName,
    };
  }
}
