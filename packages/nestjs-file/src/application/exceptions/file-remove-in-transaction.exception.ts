import { FileException } from '../../domain/exceptions/file.exception.js';

/**
 * Removing a file commits its `removing` status before the storage service
 * deletes the object. Inside a caller's transaction nothing would commit
 * until the caller's transaction did, so a rollback could leave a row
 * pointing at an object that no longer exists.
 */
export class FileRemoveInTransactionException extends FileException {
  constructor() {
    super({
      message:
        'RemoveFileCommand must be dispatched outside a transaction, so its status commits before storage deletes the object',
      fault: 'usage',
    });

    this.errorCode = 'FILE_REMOVE_IN_TRANSACTION_ERROR';
  }
}
