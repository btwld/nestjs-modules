import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { type FileStatus } from '../interfaces/file-status.type.js';

import { FileException } from './file.exception.js';

export class FileStatusException extends FileException {
  declare context: RuntimeException['context'] & {
    id: string;
    status: FileStatus;
    action: string;
  };

  constructor(options: { id: string; status: FileStatus; action: string }) {
    const { id, status, action } = options;

    super({
      message: 'Cannot %s file %s while its status is %s',
      messageParams: [action, id, status],
      httpStatus: HttpStatus.CONFLICT,
      fault: 'client',
    });

    this.errorCode = 'FILE_STATUS_ERROR';

    this.context = {
      ...this.context,
      id,
      status,
      action,
    };
  }
}
