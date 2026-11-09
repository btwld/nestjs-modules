import { type RuntimeException } from '@concepta/nestjs-core';

import { FileException } from './file.exception.js';

export class FileStorageNotFoundException extends FileException {
  declare context: RuntimeException['context'] & {
    serviceKey: string;
  };

  constructor(serviceKey: string) {
    super({
      message: 'No storage service is registered for key %s',
      messageParams: [serviceKey],
      fault: 'usage',
    });

    this.errorCode = 'FILE_STORAGE_NOT_FOUND_ERROR';

    this.context = {
      ...this.context,
      serviceKey,
    };
  }
}
