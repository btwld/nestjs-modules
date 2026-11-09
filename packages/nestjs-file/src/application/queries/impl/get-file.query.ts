import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type File } from '../../../domain/aggregates/file.js';
import { type FileReadOptionsInterface } from '../../../domain/interfaces/file-read-options.interface.js';

/**
 * Reads a file. Never asks storage for anything; use
 * `GetFileDownloadQuery` for a download URL.
 */
export class GetFileQuery extends Query<File> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly id: ReferenceId,
    public readonly options: FileReadOptionsInterface = {},
  ) {
    super();
  }
}
