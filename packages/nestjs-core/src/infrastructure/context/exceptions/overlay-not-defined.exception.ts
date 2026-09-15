import { type RuntimeExceptionOptions } from '../../../domain/exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../domain/exceptions/runtime.exception.js';

export class OverlayNotDefinedException extends RuntimeException {
  constructor(name: string, options?: RuntimeExceptionOptions) {
    super({
      message: `Overlay "${name}" is not defined on the context. Ensure the corresponding interceptor is applied to this route.`,
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'OVERLAY_NOT_DEFINED';
  }
}
