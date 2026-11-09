import { FileException } from '../../domain/exceptions/file.exception.js';

/**
 * Recording a rejection commits `rejecting` before the storage service
 * deletes the object. Inside a caller's transaction nothing would commit
 * until the caller's transaction did, so a rollback could hide a rejection
 * whose object is already gone.
 */
export class FileScanResultInTransactionException extends FileException {
  constructor() {
    super({
      message:
        'RecordFileScanResultCommand must be dispatched outside a transaction, so its status commits before storage deletes the object',
      fault: 'usage',
    });

    this.errorCode = 'FILE_SCAN_RESULT_IN_TRANSACTION_ERROR';
  }
}
