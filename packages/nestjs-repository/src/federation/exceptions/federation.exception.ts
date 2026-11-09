import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Thrown when a read of a federated relation cannot be answered exactly or
 * within `federation.maxKeys`, when the related rows contradict the relation,
 * or when a federated relation is wired wrongly.
 */
export class FederationException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super({ fault: 'internal', ...options });
    this.errorCode = 'FEDERATION_ERROR';
  }
}
