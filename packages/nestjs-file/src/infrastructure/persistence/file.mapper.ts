import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { File } from '../../domain/aggregates/file.js';

import { type FileEntityInterface } from './interfaces/file-entity.interface.js';

export class FileMapper extends DomainMapper<FileEntityInterface, File> {
  /**
   * Picks the file's own fields, so a relation the consumer's entity loads
   * never reaches the aggregate, or a write.
   */
  createAggregate(entity: FileEntityInterface): File {
    const {
      id,
      version,
      dateCreated,
      dateUpdated,
      dateDeleted,
      serviceKey,
      fileName,
      contentType,
      size,
      status,
    } = entity;

    return new File(
      id,
      // A 64-bit integer column can hydrate as a string.
      { serviceKey, fileName, contentType, size: Number(size), status },
      version,
      {
        dateCreated,
        dateUpdated,
        dateDeleted,
      },
    );
  }

  toPersistence(file: File): FileEntityInterface {
    return file.toPlain();
  }
}
