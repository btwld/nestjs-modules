import { type RuntimeExceptionOptions } from '../../../domain/exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../domain/exceptions/runtime.exception.js';

export class HookNotDecoratedException extends RuntimeException {
  constructor(hookName: string, options?: RuntimeExceptionOptions) {
    super({
      message: `Hook class "%s" is registered via @UseHooks() but is missing the class-level @Hook() (or subsystem-specific, e.g. @RepoHook()) decorator, so its methods will never run.`,
      messageParams: [hookName],
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'HOOK_NOT_DECORATED';
  }
}
