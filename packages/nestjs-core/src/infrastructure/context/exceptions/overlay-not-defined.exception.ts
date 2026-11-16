import { type RuntimeExceptionOptions } from '../../../domain/exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../domain/exceptions/runtime.exception.js';

export class OverlayNotDefinedException extends RuntimeException {
  constructor(name: string, options?: RuntimeExceptionOptions) {
    super({
      message: `Overlay "${name}" is not defined on the context. Either the interceptor that attaches it is not applied to this route, or this call did not come from a route at all — a nested write forwarding its context, a queue consumer, a cron job, a seeder or a test reaches the same code with only the overlays its own caller supplied.`,
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'OVERLAY_NOT_DEFINED';
  }
}
