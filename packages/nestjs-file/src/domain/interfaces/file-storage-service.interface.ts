import { type PlainLiteralObject } from '@nestjs/common';

import { type FileObjectInterface } from './file-object.interface.js';
import { type FileUploadTargetInterface } from './file-upload-target.interface.js';

/**
 * A storage backend (S3, a filesystem, ...). Register one per `KEY` in the
 * module's `storageServices` option. A file uses the service whose `KEY`
 * equals its `serviceKey`.
 *
 * Key each stored object by the file's `id`. `fileName` is a display name
 * that several files may share.
 */
export interface FileStorageServiceInterface {
  /**
   * Matched against a file's `serviceKey`.
   */
  KEY: string;

  /**
   * A signed, expiring target the client uploads the file's bytes to. Sign
   * the file's `contentType` and `size` into it, so storage refuses an
   * upload of another type or size before writing it.
   */
  getUploadTarget(
    ctx: PlainLiteralObject,
    file: FileObjectInterface,
  ): Promise<FileUploadTargetInterface> | FileUploadTargetInterface;

  /**
   * A signed, expiring URL the client GETs the file's bytes from.
   */
  getSignedDownloadUrl(
    ctx: PlainLiteralObject,
    file: FileObjectInterface,
  ): Promise<string> | string;

  /**
   * Whether the object has been uploaded. When omitted, confirming an upload
   * does not check storage.
   */
  exists?(
    ctx: PlainLiteralObject,
    file: FileObjectInterface,
  ): Promise<boolean> | boolean;

  /**
   * Delete the stored object. When omitted, removing a file deletes only its
   * row.
   *
   * Must be idempotent: resolve when the object is already gone. A removal
   * that is retried after a crash calls this again for an object it already
   * deleted.
   */
  delete?(
    ctx: PlainLiteralObject,
    file: FileObjectInterface,
  ): Promise<void> | void;
}
