import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a structural row scope check fails at startup.
 *
 * Every one of these is a misconfiguration that would otherwise let some
 * operation run unscoped, so they are startup failures rather than warnings.
 */
export class RowScopeBootException extends RuntimeException {
  declare context: RuntimeException['context'] & { failures: string[] };

  constructor(failures: string[], options?: RuntimeExceptionOptions) {
    super({
      message: 'Row scope startup checks failed:\n%s',
      messageParams: [failures.map((f) => `  - ${f}`).join('\n')],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, failures };
    this.errorCode = 'ROW_SCOPE_BOOT_CHECK_FAILED';
  }
}
