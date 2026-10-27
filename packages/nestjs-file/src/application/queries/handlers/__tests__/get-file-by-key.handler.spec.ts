import {
  createMockFile,
  createMockFileRepository,
  STORAGE_KEY,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { type FileGetOptionsInterface } from '../../../../domain/interfaces/file-get-options.interface.js';
import { GetFileByKeyQuery } from '../../impl/get-file-by-key.query.js';
import { GetFileByKeyHandler } from '../get-file-by-key.handler.js';

describe(GetFileByKeyHandler.name, () => {
  const key = { serviceKey: STORAGE_KEY, fileName: 'docs/a.pdf' };

  let fileRepository: ReturnType<typeof createMockFileRepository>;
  let handler: GetFileByKeyHandler;

  beforeEach(() => {
    fileRepository = createMockFileRepository();
    handler = new GetFileByKeyHandler(fileRepository);
  });

  it('returns the file or null', async () => {
    const file = createMockFile();
    fileRepository.findByKey.mockResolvedValueOnce(file);
    fileRepository.findByKey.mockResolvedValueOnce(null);

    expect(
      await handler.execute(
        new GetFileByKeyQuery({}, key, { status: ['pending'] }),
      ),
    ).toBe(file);
    expect(await handler.execute(new GetFileByKeyQuery({}, key))).toBeNull();
    expect(fileRepository.findByKey).toHaveBeenNthCalledWith(1, {}, key, {
      status: ['pending'],
    });
  });

  it('never reads soft-deleted files, whatever the options hold', async () => {
    const options: FileGetOptionsInterface = { withDeleted: true };

    await handler.execute(new GetFileByKeyQuery({}, key, options));

    const [[, , passed]] = fileRepository.findByKey.mock.calls;
    expect(passed).not.toHaveProperty('withDeleted');
  });
});
