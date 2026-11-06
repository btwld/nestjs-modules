import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type File } from '../aggregates/file.js';
import { type FileGetOptionsInterface } from '../interfaces/file-get-options.interface.js';

/**
 * Every write against a stored file (status, soft delete, restore, delete)
 * must be guarded on the version the file was read at, and return the file
 * as stored. Without that, a confirm and a removal that race overwrite each
 * other instead of one failing.
 */
export interface FileRepositoryInterface {
  /**
   * Finds a file by id. Soft-deleted files are found only with `withDeleted`.
   */
  get(
    ctx: PlainLiteralObject,
    id: ReferenceId,
    options?: FileGetOptionsInterface,
  ): Promise<File | null>;

  /**
   * Writes a new file.
   */
  create(ctx: PlainLiteralObject, file: File): Promise<void>;

  /**
   * Writes the file's status, guarded on the version it was read at. Returns
   * the file as stored, at its new version.
   */
  updateStatus(ctx: PlainLiteralObject, file: File): Promise<File>;

  /**
   * Soft-deletes the file, guarded on the version it was read at. Returns
   * the file as stored, with its delete date.
   */
  softDelete(ctx: PlainLiteralObject, file: File): Promise<File>;

  /**
   * Restores a soft-deleted file, guarded on the version it was read at.
   * Returns the file as stored.
   */
  restore(ctx: PlainLiteralObject, file: File): Promise<File>;

  /**
   * Deletes the row, soft-deleted or not, guarded on the version it was read
   * at.
   */
  remove(ctx: PlainLiteralObject, file: File): Promise<void>;
}
