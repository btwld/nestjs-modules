import { type RuntimeExceptionOptions } from '../../../domain/exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../domain/exceptions/runtime.exception.js';

export class HookProviderNotFoundException extends RuntimeException {
  constructor(hookName: string, options?: RuntimeExceptionOptions) {
    super({
      message: `Hook class "%s" is registered via @UseHooks() but could not be resolved. Ensure it is registered in the module's providers.`,
      messageParams: [hookName],
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'HOOK_PROVIDER_NOT_FOUND';
  }
}
