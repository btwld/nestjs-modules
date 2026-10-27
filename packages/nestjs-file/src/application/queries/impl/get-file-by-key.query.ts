import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type File } from '../../../domain/aggregates/file.js';
import { type FileKeyInterface } from '../../../domain/interfaces/file-key.interface.js';
import { type FileReadOptionsInterface } from '../../../domain/interfaces/file-read-options.interface.js';

export class GetFileByKeyQuery extends Query<File | null> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly key: FileKeyInterface,
    public readonly options: FileReadOptionsInterface = {},
  ) {
    super();
  }
}
