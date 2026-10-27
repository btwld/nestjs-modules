import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a repository is asked to serve an operation before
 * `RepositoryModule.forRoot()` bound its declarations to it, because it was
 * built outside `forRoot()`.
 *
 * Its row scope, hooks and write policy arrive only by binding, so an unbound
 * repository cannot tell which of them it should apply, and refuses rather
 * than run without them.
 */
export class RepositoryUnboundException extends RuntimeException {
  declare context: RuntimeException['context'] & { entityKey: string };

  constructor(entityKey: string, options?: RuntimeExceptionOptions) {
    super({
      message:
        'Repository "%s" was not registered through RepositoryModule.forRoot(), ' +
        'so its row scope, hooks and write policy were never bound and it ' +
        'cannot serve this operation.',
      messageParams: [entityKey],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, entityKey };
    this.errorCode = 'REPOSITORY_UNBOUND';
  }
}
