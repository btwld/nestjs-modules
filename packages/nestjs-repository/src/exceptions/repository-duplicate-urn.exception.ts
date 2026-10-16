import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when two registrations read the same rows (the same URN).
 *
 * An entity is registered once and shared by importing the module that
 * registers it; a second registration could carry a row scope, write policy
 * or hooks that disagree with the first.
 */
export class RepositoryDuplicateUrnException extends RuntimeException {
  constructor(
    duplicates: { urn: string; existing: string; attempted: string }[],
    options?: RuntimeExceptionOptions,
  ) {
    const details = duplicates.map(
      (d) =>
        `"${d.attempted}" reads ${d.urn}, already registered as "${d.existing}"`,
    );

    super({
      message:
        'Rows registered twice: %s. Register them once, and import the ' +
        'module that registers them wherever they are needed',
      messageParams: [details.join('; ')],
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'DUPLICATE_REPOSITORY_URN';
  }
}
