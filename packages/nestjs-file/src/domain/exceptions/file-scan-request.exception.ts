import { type RuntimeException } from '@concepta/nestjs-core';

import { FileException } from './file.exception.js';

/**
 * The scanner failed to accept a scan request; its error is the `cause`.
 * The file stays `scanning` or `rescanning`, blocked, until a result is
 * recorded.
 */
export class FileScanRequestException extends FileException {
  declare context: RuntimeException['context'] & {
    id: string;
  };

  constructor(options: { id: string; originalError: unknown }) {
    const { id, originalError } = options;

    super({
      message: 'The scanner failed to accept a scan of file %s',
      messageParams: [id],
      originalError,
      fault: 'internal',
    });

    this.errorCode = 'FILE_SCAN_REQUEST_ERROR';

    this.context = {
      ...this.context,
      id,
    };
  }
}
