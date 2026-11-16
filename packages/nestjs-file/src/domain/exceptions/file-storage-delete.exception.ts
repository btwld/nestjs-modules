import { type RuntimeException } from '@concepta/nestjs-core';

import { FileException } from './file.exception.js';

export class FileStorageDeleteException extends FileException {
  declare context: RuntimeException['context'] & {
    serviceKey: string;
  };

  constructor(options: { serviceKey: string; originalError: unknown }) {
    const { serviceKey, originalError } = options;

    super({
      message: 'Storage service %s failed to delete a file',
      messageParams: [serviceKey],
      originalError,
      fault: 'internal',
    });

    this.errorCode = 'FILE_STORAGE_DELETE_ERROR';

    this.context = {
      ...this.context,
      serviceKey,
    };
  }
}
