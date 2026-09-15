import { type RuntimeExceptionOptions } from '../../exceptions/interfaces/runtime-exception-options.interface';
import { RuntimeException } from '../../exceptions/runtime.exception';

export class ModelQueryException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    entityName: string;
  };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Error while trying to query a %s model',
      messageParams: [entityName],
      ...options,
    });

    this.context = {
      ...this.context,
      entityName,
    };

    this.errorCode = 'MODEL_QUERY_ERROR';
  }
}
