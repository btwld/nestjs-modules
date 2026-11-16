import { type RuntimeExceptionOptions } from '../../../domain/exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../domain/exceptions/runtime.exception.js';

export class AppContextUnavailableException extends RuntimeException {
  constructor(type: string, options?: RuntimeExceptionOptions) {
    super({
      message: `No application context is available for this "${type}" call. Request context works on HTTP routes and, in preview, RPC message handlers (except gRPC call-stream handlers). Create one with \`new AppContextHost()\` and pass it on yourself.`,
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'APP_CONTEXT_UNAVAILABLE';
  }
}
