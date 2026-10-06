import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

import { FileException } from './file.exception';

export class FileStorageServiceNotFoundException extends FileException {
  context: RuntimeException['context'] & {
    storageServiceName: string;
  };

  constructor(assignmentName: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Storage Service %s was not registered to be used.',
      messageParams: [assignmentName],
      ...options,
    });

    this.errorCode = 'FILE_STORAGE_SERVICE_NOT_FOUND_ERROR';

    this.context = {
      ...this.context,
      storageServiceName: assignmentName,
    };
  }
}
