import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when entity name cannot be resolved from TypeORM metadata.
 */
export class TypeOrmEntityNameException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Unable to resolve entity name from TypeORM repository metadata',
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'TYPEORM_ENTITY_NAME_RESOLUTION';
  }
}
