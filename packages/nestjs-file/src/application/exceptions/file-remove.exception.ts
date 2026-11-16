import { type RuntimeException } from '@concepta/nestjs-core';

import { FileException } from '../../domain/exceptions/file.exception.js';

/**
 * The storage service failed to delete the object; the
 * `FileStorageDeleteException` that reports it is the `cause`.
 * A live file is left `remove-failed`, unless that status couldn't be
 * recorded either (`context.statusError`); a soft-deleted file is left as it
 * was. Removing it again retries.
 */
export class FileRemoveException extends FileException {
  declare context: RuntimeException['context'] & {
    id: string;
    statusError?: unknown;
  };

  constructor(options: {
    id: string;
    originalError: unknown;
    statusError?: unknown;
  }) {
    const { id, originalError, statusError } = options;

    super({
      message: 'Storage failed to delete the object for file %s',
      messageParams: [id],
      originalError,
      fault: 'internal',
    });

    this.errorCode = 'FILE_REMOVE_ERROR';

    this.context = {
      ...this.context,
      id,
      ...(statusError === undefined ? {} : { statusError }),
    };
  }
}
