import { type RuntimeException } from '@concepta/nestjs-core';

import { FileException } from './file.exception.js';

export class FileUploadTargetException extends FileException {
  declare context: RuntimeException['context'] & {
    serviceKey: string;
  };

  constructor(options: { serviceKey: string; originalError: unknown }) {
    const { serviceKey, originalError } = options;

    super({
      message: 'Storage service %s failed to create an upload target',
      messageParams: [serviceKey],
      originalError,
      fault: 'internal',
    });

    this.errorCode = 'FILE_UPLOAD_TARGET_ERROR';

    this.context = {
      ...this.context,
      serviceKey,
    };
  }
}
