import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import { type File } from '../aggregates/file.js';
import { FileDownloadUrlException } from '../exceptions/file-download-url.exception.js';
import { FileExistsCheckException } from '../exceptions/file-exists-check.exception.js';
import { FileStorageDeleteException } from '../exceptions/file-storage-delete.exception.js';
import { FileStorageNotFoundException } from '../exceptions/file-storage-not-found.exception.js';
import { FileUploadUrlException } from '../exceptions/file-upload-url.exception.js';
import { type FileCreatedResultInterface } from '../interfaces/file-created-result.interface.js';
import { type FileReadResultInterface } from '../interfaces/file-read-result.interface.js';
import { type FileStorageServiceInterface } from '../interfaces/file-storage-service.interface.js';

/**
 * Routes each call to the storage service registered for the file's
 * `serviceKey`.
 */
@Injectable()
export class FileStorageService {
  constructor(
    private readonly storageServices: FileStorageServiceInterface[],
  ) {}

  resolve(serviceKey: string): FileStorageServiceInterface {
    const storageService = this.storageServices.find(
      (candidate) => candidate.KEY === serviceKey,
    );

    if (!storageService) {
      throw new FileStorageNotFoundException(serviceKey);
    }

    return storageService;
  }

  /**
   * The file with both signed URLs, for create.
   */
  async toCreatedResult(
    ctx: PlainLiteralObject,
    file: File,
  ): Promise<FileCreatedResultInterface> {
    const storageService = this.resolve(file.serviceKey);

    let signedUploadUrl: string;
    try {
      signedUploadUrl = await storageService.getSignedUploadUrl(
        ctx,
        file.toPlain(),
      );
    } catch (originalError) {
      throw new FileUploadUrlException({
        serviceKey: file.serviceKey,
        originalError,
      });
    }

    const { signedDownloadUrl } = await this.toReadResult(ctx, file);

    return { file, signedUploadUrl, signedDownloadUrl };
  }

  /**
   * The file with its signed download URL, for confirm and reads. Never
   * asks for an upload URL.
   */
  async toReadResult(
    ctx: PlainLiteralObject,
    file: File,
  ): Promise<FileReadResultInterface> {
    const storageService = this.resolve(file.serviceKey);

    try {
      const signedDownloadUrl = await storageService.getSignedDownloadUrl(
        ctx,
        file.toPlain(),
      );

      return { file, signedDownloadUrl };
    } catch (originalError) {
      throw new FileDownloadUrlException({
        serviceKey: file.serviceKey,
        originalError,
      });
    }
  }

  /**
   * Whether the object is uploaded. `true` when the storage service does not
   * implement `exists`. A failed check throws `FileExistsCheckException`, with
   * the storage error as its `cause`.
   */
  async exists(ctx: PlainLiteralObject, file: File): Promise<boolean> {
    const storageService = this.resolve(file.serviceKey);

    if (!storageService.exists) {
      return true;
    }

    try {
      return await storageService.exists(ctx, file.toPlain());
    } catch (originalError) {
      throw new FileExistsCheckException({
        serviceKey: file.serviceKey,
        originalError,
      });
    }
  }

  /**
   * Deletes the stored object. Does nothing when the storage service does
   * not implement `delete`. A failure throws `FileStorageDeleteException`,
   * with the storage error as its `cause`.
   */
  async delete(ctx: PlainLiteralObject, file: File): Promise<void> {
    const storageService = this.resolve(file.serviceKey);

    if (!storageService.delete) {
      return;
    }

    try {
      await storageService.delete(ctx, file.toPlain());
    } catch (originalError) {
      throw new FileStorageDeleteException({
        serviceKey: file.serviceKey,
        originalError,
      });
    }
  }
}
