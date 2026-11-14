import { type RuntimeExceptionOptions } from '../../../domain/exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../domain/exceptions/runtime.exception.js';

/**
 * Thrown at startup when the route audit, in its default `throw` mode,
 * finds a violation, listing every one: each line names the route and the
 * rule it fails.
 */
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

    this.errorCode = 'ROUTE_AUDIT_FAILED_ERROR';
  }
}
