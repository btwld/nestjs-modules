import { type RuntimeExceptionOptions } from '../../../domain/exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../domain/exceptions/runtime.exception.js';

export class RouteAuditFailedException extends RuntimeException {
  constructor(lines: readonly string[], options?: RuntimeExceptionOptions) {
    super({
      message: `The route audit found %s violation(s):\n%s`,
      messageParams: [
        lines.length,
        lines.map((line) => `  - ${line}`).join('\n'),
      ],
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'ROUTE_AUDIT_FAILED';
  }
}
