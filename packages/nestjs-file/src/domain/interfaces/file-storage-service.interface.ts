import { type PlainLiteralObject } from '@nestjs/common';

import { type FileInterface } from './file.interface.js';

/**
 * A storage backend (S3, a filesystem, ...). Register one per `KEY` in the
 * module's `storageServices` option. A file uses the service whose `KEY`
 * equals its `serviceKey`.
 */
export interface FileStorageServiceInterface {
  /**
   * Matched against a file's `serviceKey`.
   */
  KEY: string;

  /**
   * A signed, expiring URL the client PUTs the file's bytes to.
   */
  getSignedUploadUrl(
    ctx: PlainLiteralObject,
    file: FileInterface,
  ): Promise<string> | string;

  /**
   * A signed, expiring URL the client GETs the file's bytes from.
   */
  getSignedDownloadUrl(
    ctx: PlainLiteralObject,
    file: FileInterface,
  ): Promise<string> | string;

  /**
   * Whether the object has been uploaded. When omitted, confirming an upload
   * does not check storage.
   */
  exists?(
    ctx: PlainLiteralObject,
    file: FileInterface,
  ): Promise<boolean> | boolean;

  /**
   * Delete the stored object. When omitted, removing a file deletes only its
   * row.
   *
   * Must be idempotent: resolve when the object is already gone. A removal
   * that is retried after a crash calls this again for an object it already
   * deleted.
   */
  delete?(ctx: PlainLiteralObject, file: FileInterface): Promise<void> | void;
}
