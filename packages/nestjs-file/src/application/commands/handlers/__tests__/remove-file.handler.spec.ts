import { OptimisticLockException } from '@concepta/nestjs-repository';

import {
  createMockEventPublisher,
  createMockFile,
  createMockFileLifecycle,
  createMockTransaction,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { FileNotFoundException } from '../../../exceptions/file-not-found.exception.js';
import { FileRemoveInTransactionException } from '../../../exceptions/file-remove-in-transaction.exception.js';
import { FileRemoveException } from '../../../exceptions/file-remove.exception.js';
import { RemoveFileCommand } from '../../impl/remove-file.command.js';
import { RemoveFileHandler } from '../remove-file.handler.js';

describe(RemoveFileHandler.name, () => {
  const removing = createMockFile({ status: 'removing', version: 2 });

  let fileLifecycle: ReturnType<typeof createMockFileLifecycle>;
  let mocks: ReturnType<typeof createMockTransaction>;
  let handler: RemoveFileHandler;

  beforeEach(() => {
    fileLifecycle = createMockFileLifecycle();
    fileLifecycle.beginRemoval.mockResolvedValue(removing);
    mocks = createMockTransaction();
    handler = new RemoveFileHandler(
      fileLifecycle,
      createMockEventPublisher(),
      mocks.transaction,
    );
  });

  it('begins in one transaction, deletes the object outside, finishes in another', async () => {
    const result = await handler.execute(new RemoveFileCommand({}, 'file-1'));

    expect(result).toBe(removing);
    const [begin] = fileLifecycle.beginRemoval.mock.invocationCallOrder;
    const [objectDelete] =
      fileLifecycle.deleteStoredObject.mock.invocationCallOrder;
    const [finish] = fileLifecycle.finishRemoval.mock.invocationCallOrder;
    expect(begin).toBeLessThan(objectDelete);
    expect(objectDelete).toBeLessThan(finish);
    expect(mocks.transaction.run).toHaveBeenCalledTimes(2);
    // The object is deleted with the caller's ctx, not inside a transaction.
    expect(fileLifecycle.deleteStoredObject).toHaveBeenCalledWith({}, removing);
    expect(mocks.trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(mocks.trxHandle.onRollback).toHaveBeenCalledTimes(1);
  });

  it('records the failure and throws when storage fails', async () => {
    const originalError = new Error('denied');
    fileLifecycle.deleteStoredObject.mockRejectedValue(originalError);

    const error = await handler
      .execute(new RemoveFileCommand({}, 'file-1'))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FileRemoveException);
    expect(error).toHaveProperty('cause', originalError);
    expect(fileLifecycle.failRemoval).toHaveBeenCalledWith(
      expect.anything(),
      removing,
    );
    expect(fileLifecycle.finishRemoval).not.toHaveBeenCalled();
    expect(mocks.trxHandle.onCommit).not.toHaveBeenCalled();
  });

  it('publishes the recorded failure once its transaction commits', async () => {
    fileLifecycle.deleteStoredObject.mockRejectedValue(new Error('denied'));
    fileLifecycle.failRemoval.mockResolvedValue(
      createMockFile({ status: 'remove-failed', version: 3 }),
    );

    await expect(
      handler.execute(new RemoveFileCommand({}, 'file-1')),
    ).rejects.toThrow(FileRemoveException);

    expect(mocks.trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(mocks.trxHandle.onRollback).toHaveBeenCalledTimes(1);
  });

  it('keeps the storage error when recording the failure loses a race', async () => {
    const originalError = new Error('denied');
    const statusError = new Error('version moved');
    fileLifecycle.deleteStoredObject.mockRejectedValue(originalError);
    fileLifecycle.failRemoval.mockRejectedValue(statusError);

    const error = await handler
      .execute(new RemoveFileCommand({}, 'file-1'))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FileRemoveException);
    expect(error).toHaveProperty('cause', originalError);
    expect(error).toHaveProperty('context.statusError', statusError);
  });

  it('marks a soft-deleted file restored mid-removal and rethrows the lock failure', async () => {
    const deleted = createMockFile({
      status: 'active',
      dateDeleted: new Date(),
    });
    const lockError = new OptimisticLockException('File');
    fileLifecycle.beginRemoval.mockResolvedValue(deleted);
    fileLifecycle.finishRemoval.mockRejectedValue(lockError);

    await expect(
      handler.execute(new RemoveFileCommand({}, 'file-1')),
    ).rejects.toBe(lockError);
    expect(fileLifecycle.failRestoredRemoval).toHaveBeenCalledWith(
      expect.anything(),
      deleted,
    );
  });

  it('leaves a live file to the removal that won', async () => {
    fileLifecycle.finishRemoval.mockRejectedValue(
      new OptimisticLockException('File'),
    );

    await expect(
      handler.execute(new RemoveFileCommand({}, 'file-1')),
    ).rejects.toThrow(OptimisticLockException);
    expect(fileLifecycle.failRestoredRemoval).not.toHaveBeenCalled();
  });

  it('refuses a ctx that already holds a transaction', async () => {
    const txCtx = await mocks.transaction.run({}, async (ctx) => ctx);

    await expect(
      handler.execute(new RemoveFileCommand(txCtx, 'file-1')),
    ).rejects.toThrow(FileRemoveInTransactionException);
    expect(fileLifecycle.beginRemoval).not.toHaveBeenCalled();
  });

  it('throws when the file does not exist, before touching storage', async () => {
    fileLifecycle.beginRemoval.mockResolvedValue(null);

    await expect(
      handler.execute(new RemoveFileCommand({}, 'missing')),
    ).rejects.toThrow(FileNotFoundException);
    expect(fileLifecycle.deleteStoredObject).not.toHaveBeenCalled();
  });
});
