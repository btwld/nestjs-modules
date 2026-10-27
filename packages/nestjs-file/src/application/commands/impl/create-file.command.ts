import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type FileCreatableInterface } from '../../../domain/interfaces/file-creatable.interface.js';
import { type FileCreatedResultInterface } from '../../../domain/interfaces/file-created-result.interface.js';

export class CreateFileCommand extends Command<FileCreatedResultInterface> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly dto: FileCreatableInterface,
  ) {
    super();
  }
}
