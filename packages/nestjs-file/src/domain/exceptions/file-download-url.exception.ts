import { type RuntimeException } from '@concepta/nestjs-core';

import { FileException } from './file.exception.js';

export class FileDownloadUrlException extends FileException {
  declare context: RuntimeException['context'] & {
    serviceKey: string;
  };

  constructor(options: { serviceKey: string; originalError: unknown }) {
    const { serviceKey, originalError } = options;

    super({
      message: 'Storage service %s failed to create a download URL',
      messageParams: [serviceKey],
      originalError,
      fault: 'internal',
    });

    this.errorCode = 'FILE_DOWNLOAD_URL_ERROR';

    this.context = {
      ...this.context,
      serviceKey,
    };
  }
}
