import { randomUUID } from 'crypto';

import {
  type DomainFactory,
  type EventContextHost,
} from '@concepta/nestjs-core';
import { MutableAggregate } from '@concepta/nestjs-core/aggregate';

import { FileCreatedEvent } from '../events/file-created.event.js';
import { FileRejectedEvent } from '../events/file-rejected.event.js';
import { FileRemoveFailedEvent } from '../events/file-remove-failed.event.js';
import { FileRemovedEvent } from '../events/file-removed.event.js';
import { FileRestoredEvent } from '../events/file-restored.event.js';
import { FileScanPassedEvent } from '../events/file-scan-passed.event.js';
import { FileScanRetriedEvent } from '../events/file-scan-retried.event.js';
import { FileSoftDeletedEvent } from '../events/file-soft-deleted.event.js';
import { FileUploadConfirmedEvent } from '../events/file-upload-confirmed.event.js';
import { FileNameInvalidException } from '../exceptions/file-name-invalid.exception.js';
import { FileStatusException } from '../exceptions/file-status.exception.js';
import { type FileCreatableInterface } from '../interfaces/file-creatable.interface.js';
import { type FileScanAttempt } from '../interfaces/file-scan-attempt.type.js';
import { type FileScanOutcomeInterface } from '../interfaces/file-scan-outcome.interface.js';
import { type FileScanResult } from '../interfaces/file-scan-result.type.js';
import { type FileStatus } from '../interfaces/file-status.type.js';
import { type FileInterface } from '../interfaces/file.interface.js';
import { sanitizeFileName } from '../utils/sanitize-file-name.js';

/**
 * The statuses of a file whose upload is confirmed.
 */
const CONFIRMED_STATUSES: FileStatus[] = [
  'scanning',
  'rescanning',
  'active',
  'rejecting',
  'rejected',
];

/**
 * A file record. The stored object lives in the storage service named by
 * `serviceKey`; this aggregate tracks it through its lifecycle.
 *
 * The status methods change only the status: the repository stamps the
 * dates and writes each change guarded on the version the file was read at.
 */
export class File extends MutableAggregate<FileInterface> {
  get serviceKey() {
    return this.props.serviceKey;
  }

  get fileName() {
    return this.props.fileName;
  }

  get contentType() {
    return this.props.contentType;
  }

  get size() {
    return this.props.size;
  }

  get status() {
    return this.props.status;
  }

  get isSoftDeleted(): boolean {
    return this.meta.dateDeleted != null;
  }

  /**
   * Whether the file is `pending` or `active` and not soft-deleted: the
   * statuses a soft delete leaves alone and a restore brings back.
   */
  get isInUse(): boolean {
    return (
      !this.isSoftDeleted &&
      (this.status === 'pending' || this.status === 'active')
    );
  }

  /**
   * Whether a download URL may be issued: `active` and not soft-deleted.
   */
  get isDownloadable(): boolean {
    return !this.isSoftDeleted && this.status === 'active';
  }

  /**
   * Whether the upload is confirmed: it is being scanned, passed, or was
   * rejected. Confirming again changes nothing.
   */
  get isUploadConfirmed(): boolean {
    return CONFIRMED_STATUSES.includes(this.status);
  }

  /**
   * The scan the file is waiting on: 1 while `scanning`, 2 while
   * `rescanning`, otherwise none.
   */
  get scanAttempt(): FileScanAttempt | undefined {
    if (this.status === 'scanning') {
      return 1;
    }

    if (this.status === 'rescanning') {
      return 2;
    }

    return undefined;
  }

  /**
   * Whether `attempt` is a scan the file has already moved past while still
   * waiting on a later one: a first scan's result arriving again while the
   * file is `rescanning`.
   */
  isWaitingPast(attempt: FileScanAttempt): boolean {
    const waitingOn = this.scanAttempt;

    return waitingOn !== undefined && attempt < waitingOn;
  }

  static create(
    eventContext: EventContextHost,
    dto: FileCreatableInterface,
  ): File {
    return File.createWithId(eventContext, randomUUID(), dto);
  }

  /**
   * Creates a pending file named with the sanitized `fileName`. Throws
   * `FileNameInvalidException` when sanitizing leaves nothing.
   */
  static createWithId(
    eventContext: EventContextHost,
    id: string,
    dto: FileCreatableInterface,
  ): File {
    const { serviceKey, contentType, size } = dto;
    const fileName = sanitizeFileName(dto.fileName);

    if (!fileName) {
      throw new FileNameInvalidException();
    }

    const file = new File(id, {
      serviceKey,
      fileName,
      contentType,
      size,
      status: 'pending',
    });

    file.apply(new FileCreatedEvent(eventContext, file.toPlain()));

    return file;
  }

  /**
   * Refuses a file that isn't pending, such as one being removed.
   */
  assertConfirmable(): void {
    this.assertStatus('confirm', ['pending']);
  }

  /**
   * Moves a pending file to `scanning` when a scanner will check it, or
   * straight to `active` when none is registered.
   */
  confirmUpload(options: { scan: boolean }): void {
    this.assertConfirmable();
    this.changeStatus(options.scan ? 'scanning' : 'active');
  }

  /**
   * Applies `FileUploadConfirmedEvent`. Call it on the file as stored after
   * the confirm, so the event carries the new version. With a scanner, the
   * file is uploaded but not yet scanned.
   */
  uploadConfirmed(eventContext: EventContextHost): void {
    this.assertStatus('announce the confirmed upload of', [
      'scanning',
      'active',
    ]);
    this.apply(new FileUploadConfirmedEvent(eventContext, this.toPlain()));
  }

  /**
   * Refuses a `pending` file: a scan result can't arrive before the upload
   * is confirmed.
   */
  assertScanRequested(): void {
    if (this.status === 'pending') {
      throw new FileStatusException({
        id: this.id,
        status: this.status,
        action: 'record a scan of',
      });
    }
  }

  /**
   * Records a scan of a `scanning` or `rescanning` file. Clean makes it
   * `active`; infected makes it `rejecting`; uncertain makes a first scan
   * `rescanning` and a rescan `rejecting`.
   */
  recordScan(result: FileScanResult): void {
    this.assertStatus('record a scan of', ['scanning', 'rescanning']);

    if (result === 'clean') {
      this.changeStatus('active');
    } else if (result === 'uncertain' && this.status === 'scanning') {
      this.changeStatus('rescanning');
    } else {
      this.changeStatus('rejecting');
    }
  }

  /**
   * Applies the event for the scan just recorded: `FileScanPassedEvent`,
   * `FileScanRetriedEvent` or `FileRejectedEvent`. Call it on the file as
   * stored after the scan is written.
   */
  scanRecorded(
    eventContext: EventContextHost,
    scan: FileScanOutcomeInterface,
  ): void {
    this.assertStatus('announce the scan of', [
      'active',
      'rescanning',
      'rejecting',
    ]);

    if (this.status === 'active') {
      this.apply(new FileScanPassedEvent(eventContext, this.toPlain()));
    } else if (this.status === 'rescanning') {
      this.apply(new FileScanRetriedEvent(eventContext, this.toPlain()));
    } else {
      this.apply(new FileRejectedEvent(eventContext, this.toPlain(), scan));
    }
  }

  /**
   * Records that a rejected file's stored object is deleted.
   */
  markRejected(): void {
    this.assertStatus('finish rejecting', ['rejecting']);
    this.changeStatus('rejected');
  }

  /**
   * Starts a removal. Allowed again from `removing` and `remove-failed`, so
   * a removal that crashed or failed can run again. Refuses a `rejecting` or
   * `rejected` file: its record stays as proof of what was refused.
   */
  markRemoving(): void {
    this.assertStatus('remove', [
      'pending',
      'scanning',
      'rescanning',
      'active',
      'removing',
      'remove-failed',
    ]);
    this.changeStatus('removing');
  }

  /**
   * Records a removal that didn't finish: from `removing`, or from `pending`
   * or `active` when a file was restored while its object was being deleted.
   */
  markRemoveFailed(): void {
    this.assertStatus('fail removal of', ['removing', 'pending', 'active']);
    this.changeStatus('remove-failed');
  }

  /**
   * Applies `FileRemoveFailedEvent`. Call it on the file as stored after
   * `remove-failed` is written.
   */
  removeFailed(eventContext: EventContextHost): void {
    this.assertStatus('announce the failed removal of', ['remove-failed']);
    this.apply(new FileRemoveFailedEvent(eventContext, this.toPlain()));
  }

  /**
   * Refuses a file that is being removed: a soft-deleted file can't change
   * status, so its removal could never be recorded.
   */
  assertSoftDeletable(): void {
    this.assertStatus('soft delete', ['pending', 'active']);
  }

  /**
   * Applies `FileSoftDeletedEvent`. Call it on the file as stored after the
   * soft delete, so the event carries the delete date.
   */
  softDeleted(eventContext: EventContextHost): void {
    this.assertSoftDeletable();
    this.apply(new FileSoftDeletedEvent(eventContext, this.toPlain()));
  }

  /**
   * Applies `FileRestoredEvent`. Call it on the file as stored after the
   * restore.
   */
  restored(eventContext: EventContextHost): void {
    this.apply(new FileRestoredEvent(eventContext, this.toPlain()));
  }

  /**
   * Applies `FileRemovedEvent`. Call it on the file being removed, when its
   * row is deleted: a live file must be `removing`, a soft-deleted one is
   * removed as it is.
   */
  removed(eventContext: EventContextHost): void {
    if (!this.isSoftDeleted) {
      this.assertStatus('remove', ['removing']);
    }

    this.apply(new FileRemovedEvent(eventContext, this.toPlain()));
  }

  private changeStatus(status: FileStatus): void {
    this.props = { ...this.props, status };
  }

  private assertStatus(action: string, allowed: FileStatus[]): void {
    if (!allowed.includes(this.status)) {
      throw new FileStatusException({
        id: this.id,
        status: this.status,
        action,
      });
    }
  }
}

File satisfies DomainFactory<FileCreatableInterface, File>;
