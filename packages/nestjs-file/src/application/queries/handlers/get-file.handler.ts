import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { type FileReadResultInterface } from '../../../domain/interfaces/file-read-result.interface.js';
import { FileRepositoryInterface } from '../../../domain/repositories/file-repository.interface.js';
import { FileStorageService } from '../../../domain/services/file-storage.service.js';
import { FILE_REPOSITORY_TOKEN } from '../../../file.constants.js';
import { FileNotFoundException } from '../../exceptions/file-not-found.exception.js';
import { GetFileQuery } from '../impl/get-file.query.js';

@QueryHandler(GetFileQuery)
export class GetFileHandler implements IQueryHandler<GetFileQuery> {
  constructor(
    @Inject(FILE_REPOSITORY_TOKEN)
    private readonly fileRepository: FileRepositoryInterface,
    private readonly fileStorage: FileStorageService,
  ) {}

  async execute(query: GetFileQuery): Promise<FileReadResultInterface> {
    const { ctx, id, options } = query;

    // Only the status filter: soft-deleted files never reach a query.
    const file = await this.fileRepository.get(ctx, id, {
      status: options.status,
    });

    if (!file) {
      throw new FileNotFoundException(id);
    }

    return this.fileStorage.toReadResult(ctx, file);
  }
}
