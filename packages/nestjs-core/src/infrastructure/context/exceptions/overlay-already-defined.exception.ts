import { type RuntimeExceptionOptions } from '../../../domain/exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../domain/exceptions/runtime.exception.js';

/**
 * Exception thrown when an overlay is defined `{ immutable: true }` but a
 * mutable overlay of the same name already exists.
 *
 * Definition is otherwise idempotent, so this would silently do nothing and
 * leave the caller believing it had hardened the overlay when it is still
 * removable, shadowable, and carrying someone else's values.
 */
export class OverlayAlreadyDefinedException extends RuntimeException {
  constructor(name: string, options?: RuntimeExceptionOptions) {
    super({
      message: `Overlay "${name}" is already defined on this context and cannot be made immutable afterwards. Define it with { immutable: true } the first time, or ensure nothing defines it earlier.`,
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'OVERLAY_ALREADY_DEFINED';
  }
}
