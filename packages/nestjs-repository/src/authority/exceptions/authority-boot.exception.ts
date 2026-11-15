import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when an authority startup check fails.
 *
 * Each is a misconfiguration that would otherwise let some read or write run
 * without its authority, so they stop startup.
 */
export class AuthorityBootException extends RuntimeException {
  declare context: RuntimeException['context'] & { failures: string[] };

  constructor(failures: string[], options?: RuntimeExceptionOptions) {
    super({
      message: 'Authority startup checks failed:\n%s',
      messageParams: [failures.map((f) => `  - ${f}`).join('\n')],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, failures };
    this.errorCode = 'AUTHORITY_BOOT_CHECK_FAILED_ERROR';
  }
}
