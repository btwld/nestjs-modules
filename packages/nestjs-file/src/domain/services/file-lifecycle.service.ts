import { Inject, Injectable, type PlainLiteralObject } from '@nestjs/common';

import { createEventContext, type ReferenceId } from '@concepta/nestjs-core';

import { FILE_REPOSITORY_TOKEN } from '../../file.constants.js';
import { File } from '../aggregates/file.js';
import { FileAlreadyExistsException } from '../exceptions/file-already-exists.exception.js';
import { FileNotUploadedException } from '../exceptions/file-not-uploaded.exception.js';
import { type FileCreatableInterface } from '../interfaces/file-creatable.interface.js';
import { FileRepositoryInterface } from '../repositories/file-repository.interface.js';

import { FileStorageService } from './file-storage.service.js';

/**
 * The rules for creating, confirming, soft-deleting, restoring and removing
 * a file. Every database method runs inside the caller's transaction and
 * never opens one, every write is guarded on the version the file was read
 * at, and every file returned is as stored, with its event applied for the
 * caller to commit; the event context comes from `ctx`. A method that finds
 * no file returns `null`.
 * `deleteStoredObject` touches only storage, and is called outside any
 * transaction.
 */
@Injectable()
export class FileLifecycleService {
  constructor(
    @Inject(FILE_REPOSITORY_TOKEN)
    private readonly fileRepository: FileRepositoryInterface,
    private readonly fileStorage: FileStorageService,
  ) {}

  /**
   * Creates a pending file. Refuses an unknown storage key and a taken name,
   * soft-deleted files included, before writing.
   */
  async create(
    ctx: PlainLiteralObject,
    dto: FileCreatableInterface,
  ): Promise<File> {
    this.fileStorage.resolve(dto.serviceKey);

    if (await this.fileRepository.existsByKey(ctx, dto)) {
      throw new FileAlreadyExistsException(dto);
    }

    const file = File.create(createEventContext(ctx, {}, {}), dto);

    await this.fileRepository.create(ctx, file);

    return file;
  }

  /**
   * Confirms a pending file's upload, after asking storage if it implements
   * `exists`. Returns an active file unchanged. Refuses a file that is being
   * removed before storage is asked.
   */
  async confirmUpload(
    ctx: PlainLiteralObject,
    id: ReferenceId,
  ): Promise<File | null> {
    const existing = await this.fileRepository.get(ctx, id);

    if (!existing || existing.isUploadConfirmed) {
      return existing;
    }

    existing.assertConfirmable();

    // Storage sees the file as it is: still pending.
    if (!(await this.fileStorage.exists(ctx, existing))) {
      throw new FileNotUploadedException(id);
    }

    existing.confirmUpload();

    const stored = await this.fileRepository.updateStatus(ctx, existing);

    stored.uploadConfirmed(createEventContext(ctx, {}, {}));

    return stored;
  }

  /**
   * Soft-deletes a pending or active file. Refuses a file that is being
   * removed before writing.
   */
  async softDelete(
    ctx: PlainLiteralObject,
    id: ReferenceId,
  ): Promise<File | null> {
    const existing = await this.fileRepository.get(ctx, id);

    if (!existing) {
      return null;
    }

    existing.assertSoftDeletable();

    const stored = await this.fileRepository.softDelete(ctx, existing);

    stored.softDeleted(createEventContext(ctx, {}, {}));

    return stored;
  }

  /**
   * Restores a soft-deleted file. Returns a file that isn't soft-deleted
   * unchanged.
   */
  async restore(
    ctx: PlainLiteralObject,
    id: ReferenceId,
  ): Promise<File | null> {
    const existing = await this.fileRepository.get(ctx, id, {
      withDeleted: true,
    });

    if (!existing?.isSoftDeleted) {
      return existing;
    }

    const stored = await this.fileRepository.restore(ctx, existing);

    stored.restored(createEventContext(ctx, {}, {}));

    return stored;
  }

  /**
   * Starts a removal; soft-deleted files are found too. Refuses an unknown
   * storage key before writing. A live file is marked `removing`, even when
   * it already is, so the version advances and a concurrent removal fails.
   * A soft-deleted file can't change status and is hidden from reads
   * already, so it is returned as it is.
   */
  async beginRemoval(
    ctx: PlainLiteralObject,
    id: ReferenceId,
  ): Promise<File | null> {
    const existing = await this.fileRepository.get(ctx, id, {
      withDeleted: true,
    });

    if (!existing) {
      return null;
    }

    this.fileStorage.resolve(existing.serviceKey);

    if (existing.isSoftDeleted) {
      return existing;
    }

    existing.markRemoving();

    return this.fileRepository.updateStatus(ctx, existing);
  }

  /**
   * Deletes the stored object. Call it outside any transaction, between
   * `beginRemoval` and `finishRemoval` or `failRemoval`. A storage failure
   * throws `FileStorageDeleteException`.
   */
  async deleteStoredObject(
    ctx: PlainLiteralObject,
    removing: File,
  ): Promise<void> {
    await this.fileStorage.delete(ctx, removing);
  }

  /**
   * Records that storage failed to delete the object by writing
   * `remove-failed`, and returns the file as stored with
   * `FileRemoveFailedEvent` applied. A soft-deleted file is left as it is,
   * and `null` is returned.
   */
  async failRemoval(
    ctx: PlainLiteralObject,
    removing: File,
  ): Promise<File | null> {
    if (removing.isSoftDeleted) {
      return null;
    }

    return this.writeRemoveFailed(ctx, removing);
  }

  /**
   * Called when a soft-deleted file's row changed while its object was being
   * deleted. A file restored meanwhile now points at a deleted object, so
   * `remove-failed` is written and the file returned as stored, with
   * `FileRemoveFailedEvent` applied. A row that is gone, soft-deleted again,
   * or being removed by another removal is left alone, and `null` returned.
   */
  async failRestoredRemoval(
    ctx: PlainLiteralObject,
    removing: File,
  ): Promise<File | null> {
    const current = await this.fileRepository.get(ctx, removing.id, {
      withDeleted: true,
    });

    if (!current?.isInUse) {
      return null;
    }

    return this.writeRemoveFailed(ctx, current);
  }

  /**
   * Finishes a removal once the object is deleted: deletes the row and
   * applies `FileRemovedEvent`.
   */
  async finishRemoval(ctx: PlainLiteralObject, removing: File): Promise<void> {
    removing.removed(createEventContext(ctx, {}, {}));

    await this.fileRepository.remove(ctx, removing);
  }

  private async writeRemoveFailed(
    ctx: PlainLiteralObject,
    file: File,
  ): Promise<File> {
    file.markRemoveFailed();

    const stored = await this.fileRepository.updateStatus(ctx, file);

    stored.removeFailed(createEventContext(ctx, {}, {}));

    return stored;
  }
}
