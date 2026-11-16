import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a repository whose entity is declared
 * `rowScope: { access: 'scoped', ... }` is asked to serve an operation before a
 * resolver has been bound to it.
 *
 * Refusing is the only safe answer: the alternative is running the operation
 * with no scope applied at all. Means the resolver depends on a
 * request-scoped provider, or that the repository was used from another
 * provider's constructor before startup attached its resolver.
 */
export class RowScopeUnboundException extends RuntimeException {
  declare context: RuntimeException['context'] & { entityKey: string };

  constructor(entityKey: string, options?: RuntimeExceptionOptions) {
    super({
      message:
        'Repository "%s" declares a row scope but has no resolver bound, so ' +
        'it cannot serve this operation. Keep the resolver and its ' +
        'dependencies singleton-scoped, and do not use the repository from ' +
        "another provider's constructor.",
      messageParams: [entityKey],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, entityKey };
    this.errorCode = 'ROW_SCOPE_UNBOUND';
  }
}
