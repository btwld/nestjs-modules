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
 * with no scope applied at all. Usually means the entity was registered
 * somewhere `RepositoryModule.forFeature()` never saw, or that a repository
 * was used from another provider's constructor, before binding.
 */
export class RowScopeUnboundException extends RuntimeException {
  declare context: RuntimeException['context'] & { entityKey: string };

  constructor(entityKey: string, options?: RuntimeExceptionOptions) {
    super({
      message:
        'Repository "%s" declares a row scope but has no resolver bound, so ' +
        'it cannot serve this operation. Register the entity through ' +
        'RepositoryModule.forFeature() so its resolver is bound at startup.',
      messageParams: [entityKey],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, entityKey };
    this.errorCode = 'ROW_SCOPE_UNBOUND';
  }
}
