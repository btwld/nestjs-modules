import { type RuntimeException } from '@concepta/nestjs-core';

import { FileException } from '../../domain/exceptions/file.exception.js';

/**
 * The storage service failed to delete a rejected file's object; the
 * `FileStorageDeleteException` that reports it is the `cause`. The file
 * stays `rejecting`, never downloadable. Recording its result again
 * retries.
 */
export class FileRejectException extends FileException {
  declare context: RuntimeException['context'] & {
    id: string;
  };

  constructor(options: { id: string; originalError: unknown }) {
    const { id, originalError } = options;

    super({
      message: 'Storage failed to delete the object for rejected file %s',
      messageParams: [id],
      originalError,
      fault: 'internal',
    });

    this.errorCode = 'FILE_REJECT_ERROR';

    this.context = {
      ...this.context,
      id,
    };
  }
}
