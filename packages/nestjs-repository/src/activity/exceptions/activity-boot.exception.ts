import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when an entity's `activity` registration cannot be bound
 * at startup.
 *
 * Every failing entity is listed, so one startup reports the whole problem
 * rather than one entity per run.
 */
export class ActivityBootException extends RuntimeException {
  declare context: RuntimeException['context'] & { failures: string[] };

  constructor(failures: string[], options?: RuntimeExceptionOptions) {
    super({
      message: 'Activity startup checks failed:\n%s',
      messageParams: [failures.map((f) => `  - ${f}`).join('\n')],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, failures };
    this.errorCode = 'ACTIVITY_BOOT_CHECK_FAILED';
  }
}
