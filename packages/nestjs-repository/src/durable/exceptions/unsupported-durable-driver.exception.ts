import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown at startup when the registration `DurableMessagingModule`
 * is configured with cannot carry durable messaging: nothing is registered
 * under the key, or its driver has no transactions or no store for its
 * database.
 */
export class UnsupportedDurableDriverException extends RuntimeException {
  declare context: RuntimeException['context'] & { key: string };

  constructor(key: string, reason: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'The "%s" registration cannot carry durable messaging: %s',
      messageParams: [key, reason],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, key };
    this.errorCode = 'DURABLE_DRIVER_UNSUPPORTED';
  }
}
