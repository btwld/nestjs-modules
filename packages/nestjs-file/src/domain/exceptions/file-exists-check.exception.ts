import { type RuntimeException } from '@concepta/nestjs-core';

import { FileException } from './file.exception.js';

export class FileExistsCheckException extends FileException {
  declare context: RuntimeException['context'] & {
    serviceKey: string;
  };

  constructor(options: { serviceKey: string; originalError: unknown }) {
    const { serviceKey, originalError } = options;

    super({
      message: 'Storage service %s failed to check whether a file exists',
      messageParams: [serviceKey],
      originalError,
      fault: 'internal',
    });

    this.errorCode = 'FILE_EXISTS_CHECK_ERROR';

    this.context = {
      ...this.context,
      serviceKey,
    };
  }
}
