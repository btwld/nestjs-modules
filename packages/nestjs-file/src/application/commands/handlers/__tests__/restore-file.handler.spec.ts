import {
  createMockEventPublisher,
  createMockFile,
  createMockFileLifecycle,
  createMockTransaction,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { FileNotFoundException } from '../../../exceptions/file-not-found.exception.js';
import { RestoreFileCommand } from '../../impl/restore-file.command.js';
import { RestoreFileHandler } from '../restore-file.handler.js';

describe(RestoreFileHandler.name, () => {
  let fileLifecycle: ReturnType<typeof createMockFileLifecycle>;
  let mocks: ReturnType<typeof createMockTransaction>;
  let handler: RestoreFileHandler;

  beforeEach(() => {
    fileLifecycle = createMockFileLifecycle();
    mocks = createMockTransaction();
    handler = new RestoreFileHandler(
      fileLifecycle,
      createMockEventPublisher(),
      mocks.transaction,
    );
  });

  it('restores in a transaction and returns the file as stored', async () => {
    const restored = createMockFile({ status: 'active' });
    fileLifecycle.restore.mockResolvedValue(restored);

    const result = await handler.execute(new RestoreFileCommand({}, 'file-1'));

    expect(result).toBe(restored);
    expect(mocks.trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(mocks.trxHandle.onRollback).toHaveBeenCalledTimes(1);
  });

  it('throws when the file does not exist', async () => {
    fileLifecycle.restore.mockResolvedValue(null);

    await expect(
      handler.execute(new RestoreFileCommand({}, 'missing')),
    ).rejects.toThrow(FileNotFoundException);
  });
});
