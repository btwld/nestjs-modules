import { FileException } from '../../../domain/exceptions/file.exception.js';
import { FileRemoveInTransactionException } from '../file-remove-in-transaction.exception.js';

describe(FileRemoveInTransactionException.name, () => {
  const exception = new FileRemoveInTransactionException();

  it('is a FileException with its error code', () => {
    expect(exception).toBeInstanceOf(FileException);
    expect(exception.errorCode).toBe('FILE_REMOVE_IN_TRANSACTION_ERROR');
  });

  it('says to dispatch the command outside a transaction', () => {
    expect(exception.message).toContain(
      'RemoveFileCommand must be dispatched outside a transaction',
    );
  });
});
