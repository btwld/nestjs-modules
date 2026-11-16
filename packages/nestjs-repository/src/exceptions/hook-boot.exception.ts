import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a structural repository hook check fails.
 *
 * Raised at startup by the boot checks, and on the call itself for the paths
 * those checks cannot reach. Every case is a misconfiguration that would
 * otherwise leave a hook running the wrong number of times — never, for a
 * declaration nothing bound, or twice, for a class registered twice.
 */
export class HookBootException extends RuntimeException {
  declare context: RuntimeException['context'] & { failures: string[] };

  constructor(failures: string[], options?: RuntimeExceptionOptions) {
    super({
      message: 'Repository hook startup checks failed:\n%s',
      messageParams: [failures.map((f) => `  - ${f}`).join('\n')],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, failures };
    this.errorCode = 'HOOK_BOOT_CHECK_FAILED';
  }
}
