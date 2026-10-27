import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { type FileKeyInterface } from '../interfaces/file-key.interface.js';

import { FileException } from './file.exception.js';

export class FileAlreadyExistsException extends FileException {
  declare context: RuntimeException['context'] & FileKeyInterface;

  constructor(key: FileKeyInterface) {
    const { serviceKey, fileName } = key;

    super({
      message: 'A file named %s already exists in storage service %s',
      messageParams: [fileName, serviceKey],
      httpStatus: HttpStatus.CONFLICT,
      fault: 'client',
    });

    this.errorCode = 'FILE_ALREADY_EXISTS_ERROR';

    this.context = {
      ...this.context,
      serviceKey,
      fileName,
    };
  }
}
