import {
  createMockEventPublisher,
  createMockFile,
  createMockFileLifecycle,
  createMockTransaction,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { FileNotFoundException } from '../../../exceptions/file-not-found.exception.js';
import { SoftDeleteFileCommand } from '../../impl/soft-delete-file.command.js';
import { SoftDeleteFileHandler } from '../soft-delete-file.handler.js';

describe(SoftDeleteFileHandler.name, () => {
  let fileLifecycle: ReturnType<typeof createMockFileLifecycle>;
  let mocks: ReturnType<typeof createMockTransaction>;
  let handler: SoftDeleteFileHandler;

  beforeEach(() => {
    fileLifecycle = createMockFileLifecycle();
    mocks = createMockTransaction();
    handler = new SoftDeleteFileHandler(
      fileLifecycle,
      createMockEventPublisher(),
      mocks.transaction,
    );
  });

  it('soft-deletes in a transaction and returns the file as stored', async () => {
    const deleted = createMockFile({
      status: 'active',
      dateDeleted: new Date(),
    });
    fileLifecycle.softDelete.mockResolvedValue(deleted);

    const result = await handler.execute(
      new SoftDeleteFileCommand({}, 'file-1'),
    );

    expect(result).toBe(deleted);
    expect(mocks.trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(mocks.trxHandle.onRollback).toHaveBeenCalledTimes(1);
  });

  it('throws when the file does not exist', async () => {
    fileLifecycle.softDelete.mockResolvedValue(null);

    await expect(
      handler.execute(new SoftDeleteFileCommand({}, 'missing')),
    ).rejects.toThrow(FileNotFoundException);
  });
});
