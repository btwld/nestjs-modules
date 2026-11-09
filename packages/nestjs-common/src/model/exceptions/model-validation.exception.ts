import { type ValidationError } from 'class-validator';

import { type RuntimeExceptionOptions } from '../../exceptions/interfaces/runtime-exception-options.interface';
import { RuntimeException } from '../../exceptions/runtime.exception';

export class ModelValidationException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    entityName: string;
    validationErrors: ValidationError[];
  };

  constructor(
    entityName: string,
    validationErrors: ValidationError[],
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Data for the %s model is not valid',
      messageParams: [entityName],
      ...options,
    });

    this.context = {
      ...this.context,
      entityName,
      validationErrors,
    };

    this.errorCode = 'MODEL_VALIDATION_ERROR';
  }
}
