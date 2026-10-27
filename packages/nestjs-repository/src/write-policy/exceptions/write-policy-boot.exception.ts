import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a structural write-policy check fails at startup.
 *
 * Every one of these is a write-policy misconfiguration — a declaration that
 * never reached the adapter, or a soft-delete column on an entity whose policy
 * means it can never be set. They are startup failures rather than warnings
 * for the same reason the row scope checks are: the alternative is discovering
 * it in production.
 *
 * Every failing entity is listed, so one startup reports the whole problem
 * rather than one entity per run.
 */
export class WritePolicyBootException extends RuntimeException {
  declare context: RuntimeException['context'] & { failures: string[] };

  constructor(failures: string[], options?: RuntimeExceptionOptions) {
    super({
      message: 'Write policy startup checks failed:\n%s',
      messageParams: [failures.map((f) => `  - ${f}`).join('\n')],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, failures };
    this.errorCode = 'WRITE_POLICY_BOOT_CHECK_FAILED';
  }
}
