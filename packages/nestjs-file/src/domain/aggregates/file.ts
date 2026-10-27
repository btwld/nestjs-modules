import { randomUUID } from 'crypto';

import {
  type DomainFactory,
  type EventContextHost,
} from '@concepta/nestjs-core';
import { MutableAggregate } from '@concepta/nestjs-core/aggregate';

import { FileCreatedEvent } from '../events/file-created.event.js';
import { FileRemoveFailedEvent } from '../events/file-remove-failed.event.js';
import { FileRemovedEvent } from '../events/file-removed.event.js';
import { FileRestoredEvent } from '../events/file-restored.event.js';
import { FileSoftDeletedEvent } from '../events/file-soft-deleted.event.js';
import { FileUploadConfirmedEvent } from '../events/file-upload-confirmed.event.js';
import { FileStatusException } from '../exceptions/file-status.exception.js';
import { type FileCreatableInterface } from '../interfaces/file-creatable.interface.js';
import { type FileStatus } from '../interfaces/file-status.type.js';
import { type FileInterface } from '../interfaces/file.interface.js';

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

  get status() {
    return this.props.status;
  }

  get isSoftDeleted(): boolean {
    return this.meta.dateDeleted != null;
  }

  /**
   * Whether the file is live and `pending` or `active`: not soft-deleted,
   * and no removal has started.
   */
  get isInUse(): boolean {
    return (
      !this.isSoftDeleted &&
      (this.status === 'pending' || this.status === 'active')
    );
  }

  /**
   * Whether the upload is confirmed: confirming again changes nothing.
   */
  get isUploadConfirmed(): boolean {
    return this.status === 'active';
  }

  static create(
    eventContext: EventContextHost,
    dto: FileCreatableInterface,
  ): File {
    return File.createWithId(eventContext, randomUUID(), dto);
  }

  static createWithId(
    eventContext: EventContextHost,
    id: string,
    dto: FileCreatableInterface,
  ): File {
    const { serviceKey, fileName, contentType } = dto;
    const file = new File(id, {
      serviceKey,
      fileName,
      contentType,
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
   * Moves a pending file to active.
   */
  confirmUpload(): void {
    this.assertConfirmable();
    this.changeStatus('active');
  }

  /**
   * Applies `FileUploadConfirmedEvent`. Call it on the file as stored after
   * the confirm, so the event carries the new version.
   */
  uploadConfirmed(eventContext: EventContextHost): void {
    this.assertStatus('announce the confirmed upload of', ['active']);
    this.apply(new FileUploadConfirmedEvent(eventContext, this.toPlain()));
  }

  /**
   * Starts a removal. Allowed from every status, so a removal that crashed
   * or failed can run again.
   */
  markRemoving(): void {
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
