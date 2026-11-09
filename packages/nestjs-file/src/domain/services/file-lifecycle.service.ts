import { Inject, Injectable, type PlainLiteralObject } from '@nestjs/common';

import { createEventContext, type ReferenceId } from '@concepta/nestjs-core';

import { FILE_REPOSITORY_TOKEN } from '../../file.constants.js';
import { File } from '../aggregates/file.js';
import { FileNotUploadedException } from '../exceptions/file-not-uploaded.exception.js';
import { type FileCreatableInterface } from '../interfaces/file-creatable.interface.js';
import { type FileLifecycleStepInterface } from '../interfaces/file-lifecycle-step.interface.js';
import { type FileScanOutcomeInterface } from '../interfaces/file-scan-outcome.interface.js';
import { FileUploadPolicy } from '../policies/file-upload.policy.js';
import { FileRepositoryInterface } from '../repositories/file-repository.interface.js';

import { FileScanService } from './file-scan.service.js';
import { FileStorageService } from './file-storage.service.js';

/**
 * The file as stored, with the scan request its status calls for: one is
 * due when a step leaves the file waiting on a scan.
 */
function toStep(file: File): FileLifecycleStepInterface {
  const attempt = file.scanAttempt;

  return attempt
    ? { file, scanRequest: { file: file.toPlain(), attempt } }
    : { file };
}

/**
 * The rules for creating, confirming, scanning, soft-deleting, restoring and
 * removing a file. Every database method runs inside the caller's
 * transaction and never opens one, every write is guarded on the version
 * the file was read at, and every file returned is as stored, with its
 * event applied for the caller to commit; the event context comes from
 * `ctx`. A method that finds no file returns `null`.
 * `deleteStoredObject` touches only storage, and is called outside any
 * transaction.
 */
@Injectable()
export class FileLifecycleService {
  constructor(
    @Inject(FILE_REPOSITORY_TOKEN)
    private readonly fileRepository: FileRepositoryInterface,
    private readonly fileStorage: FileStorageService,
    private readonly uploadPolicy: FileUploadPolicy,
    // Without a scanner, a confirmed upload is active at once.
    private readonly fileScan: FileScanService = new FileScanService(),
  ) {}

  /**
   * Creates a pending file with a sanitized name. Refuses an unknown storage
   * key, a name that sanitizes to nothing, and a file the upload policy
   * doesn't allow, before writing.
   */
  async create(
    ctx: PlainLiteralObject,
    dto: FileCreatableInterface,
  ): Promise<File> {
    this.fileStorage.resolve(dto.serviceKey);

    const file = File.create(createEventContext(ctx, {}, {}), dto);

    // The policy sees the sanitized name, as stored.
    this.uploadPolicy.assertAllowed(file);

    await this.fileRepository.create(ctx, file);

    return file;
  }

  /**
   * Confirms a pending file's upload, after asking storage if it implements
   * `exists`. With a scanner, the file becomes `scanning` and the step
   * carries the first scan request; without one, it becomes `active`.
   * Returns a file whose upload is already confirmed unchanged, with no scan
   * request. Refuses a file that is being removed before storage is asked.
   */
  async confirmUpload(
    ctx: PlainLiteralObject,
    id: ReferenceId,
  ): Promise<FileLifecycleStepInterface | null> {
    const existing = await this.fileRepository.get(ctx, id);

    if (!existing) {
      return null;
    }

    if (existing.isUploadConfirmed) {
      return { file: existing };
    }

    existing.assertConfirmable();

    // Storage sees the file as it is: still pending.
    if (!(await this.fileStorage.exists(ctx, existing))) {
      throw new FileNotUploadedException(id);
    }

    existing.confirmUpload({ scan: this.fileScan.isEnabled });

    const stored = await this.fileRepository.updateStatus(ctx, existing);

    stored.uploadConfirmed(createEventContext(ctx, {}, {}));

    return toStep(stored);
  }

  /**
   * Records a scan result for a `scanning` or `rescanning` file. A first
   * uncertain result carries the rescan request; an infected result, or a
   * second uncertain one, leaves the file `rejecting` with
   * `FileRejectedEvent` applied, for `deleteStoredObject` and
   * `finishRejection`. A result for another attempt than the one the file
   * waits on, or for a file no longer waiting, is returned unchanged.
   * Refuses a result for a `pending` file: no scan was requested.
   */
  async recordScanResult(
    ctx: PlainLiteralObject,
    id: ReferenceId,
    scan: FileScanOutcomeInterface,
  ): Promise<FileLifecycleStepInterface | null> {
    const existing = await this.fileRepository.get(ctx, id);

    if (!existing) {
      return null;
    }

    existing.assertScanRequested();

    if (existing.scanAttempt !== scan.attempt) {
      return { file: existing };
    }

    existing.recordScan(scan.result);

    const stored = await this.fileRepository.updateStatus(ctx, existing);

    stored.scanRecorded(createEventContext(ctx, {}, {}), scan);

    return toStep(stored);
  }

  /**
   * Finishes a rejection once its object is deleted: writes `rejected` and
   * returns the file as stored.
   */
  async finishRejection(
    ctx: PlainLiteralObject,
    rejecting: File,
  ): Promise<File> {
    rejecting.markRejected();

    return this.fileRepository.updateStatus(ctx, rejecting);
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
   * Deletes the stored object. Call it outside any transaction: between
   * `beginRemoval` and `finishRemoval` or `failRemoval`, or between a
   * rejection and `finishRejection`. A storage failure throws
   * `FileStorageDeleteException`.
   */
  async deleteStoredObject(ctx: PlainLiteralObject, file: File): Promise<void> {
    await this.fileStorage.delete(ctx, file);
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
