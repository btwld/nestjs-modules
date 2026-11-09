import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type File } from '../../../domain/aggregates/file.js';

/**
 * Deletes the stored object, then the row. Dispatch it outside any
 * transaction: `ctx` must not carry one.
 */
export class RemoveFileCommand extends Command<File> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly id: ReferenceId,
  ) {
    super();
  }
}
