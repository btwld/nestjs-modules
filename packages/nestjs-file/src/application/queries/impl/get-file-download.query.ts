import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type FileReadOptionsInterface } from '../../../domain/interfaces/file-read-options.interface.js';
import { type FileReadResultInterface } from '../../../domain/interfaces/file-read-result.interface.js';

/**
 * Reads a file with a signed download URL, issued only when the file is
 * `active`.
 */
export class GetFileDownloadQuery extends Query<FileReadResultInterface> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly id: ReferenceId,
    public readonly options: FileReadOptionsInterface = {},
  ) {
    super();
  }
}
