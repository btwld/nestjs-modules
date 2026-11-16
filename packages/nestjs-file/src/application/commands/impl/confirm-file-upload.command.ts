import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type FileReadResultInterface } from '../../../domain/interfaces/file-read-result.interface.js';

export class ConfirmFileUploadCommand extends Command<FileReadResultInterface> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly id: ReferenceId,
  ) {
    super();
  }
}
