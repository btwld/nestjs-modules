import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { File } from '../../../domain/aggregates/file.js';
import { FileRepositoryInterface } from '../../../domain/repositories/file-repository.interface.js';
import { FILE_REPOSITORY_TOKEN } from '../../../file.constants.js';
import { GetFileByKeyQuery } from '../impl/get-file-by-key.query.js';

@QueryHandler(GetFileByKeyQuery)
export class GetFileByKeyHandler implements IQueryHandler<GetFileByKeyQuery> {
  constructor(
    @Inject(FILE_REPOSITORY_TOKEN)
    private readonly fileRepository: FileRepositoryInterface,
  ) {}

  async execute(query: GetFileByKeyQuery): Promise<File | null> {
    const { ctx, key, options } = query;

    // Only the status filter: soft-deleted files never reach a query.
    return this.fileRepository.findByKey(ctx, key, { status: options.status });
  }
}
