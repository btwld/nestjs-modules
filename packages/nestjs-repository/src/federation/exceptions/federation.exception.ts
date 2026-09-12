import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown during federation query orchestration.
 */
export class FederationException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super({ fault: 'internal', ...options });
    this.errorCode = 'FEDERATION_ERROR';
  }
}
