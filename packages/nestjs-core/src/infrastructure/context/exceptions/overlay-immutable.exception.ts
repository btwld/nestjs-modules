import { type RuntimeExceptionOptions } from '../../../domain/exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../domain/exceptions/runtime.exception.js';

/**
 * Exception thrown when something tries to redefine an overlay that was
 * defined as immutable — including shadowing it on a prototype child.
 *
 * Silently ignoring the attempt would leave the caller believing it had
 * changed the context, which for an overlay carrying authorization input is
 * the dangerous direction to be wrong in.
 */
export class OverlayImmutableException extends RuntimeException {
  constructor(name: string, options?: RuntimeExceptionOptions) {
    super({
      message: `Overlay "${name}" is immutable and is already defined on this context. An immutable overlay cannot be redefined, shadowed, or removed.`,
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'OVERLAY_IMMUTABLE';
  }
}
