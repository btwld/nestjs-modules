import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a governed entity's repository is asked to serve an
 * operation before its authority was attached.
 *
 * Refusing is the only safe answer: the alternative is running the operation
 * with nothing deciding it. Means the authority depends on a request-scoped
 * provider, or that the repository was used from another provider's
 * constructor before startup attached it.
 */
export class AuthorityUnboundException extends RuntimeException {
  declare context: RuntimeException['context'] & { entityKey: string };

  constructor(entityKey: string, options?: RuntimeExceptionOptions) {
    super({
      message:
        'Repository "%s" is governed by an authority that is not attached, ' +
        'so it cannot serve this operation. Keep the authority and its ' +
        'dependencies singleton-scoped, and do not use the repository from ' +
        "another provider's constructor.",
      messageParams: [entityKey],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, entityKey };
    this.errorCode = 'AUTHORITY_UNBOUND';
  }
}
