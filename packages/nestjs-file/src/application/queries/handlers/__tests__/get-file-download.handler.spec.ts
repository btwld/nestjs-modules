import {
  createMockFile,
  createMockFileRepository,
  FakeStorageService,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { type FileGetOptionsInterface } from '../../../../domain/interfaces/file-get-options.interface.js';
import { FileStorageService } from '../../../../domain/services/file-storage.service.js';
import { FileNotFoundException } from '../../../exceptions/file-not-found.exception.js';
import { GetFileDownloadQuery } from '../../impl/get-file-download.query.js';
import { GetFileDownloadHandler } from '../get-file-download.handler.js';

describe(GetFileDownloadHandler.name, () => {
  let fileRepository: ReturnType<typeof createMockFileRepository>;
  let handler: GetFileDownloadHandler;

  beforeEach(() => {
    fileRepository = createMockFileRepository();
    handler = new GetFileDownloadHandler(
      fileRepository,
      new FileStorageService([new FakeStorageService()]),
    );
  });

  it('returns the file with its download url, passing the status filter', async () => {
    const file = createMockFile({ status: 'active' });
    fileRepository.get.mockResolvedValue(file);

    const result = await handler.execute(
      new GetFileDownloadQuery({}, 'file-1', { status: ['active'] }),
    );

    expect(fileRepository.get).toHaveBeenCalledWith({}, 'file-1', {
      status: ['active'],
    });
    expect(result).toEqual({
      file,
      signedDownloadUrl: 'https://download.test/file-1',
    });
  });

  it('reads every status by default', async () => {
    fileRepository.get.mockResolvedValue(createMockFile());

    await handler.execute(new GetFileDownloadQuery({}, 'file-1'));

    expect(fileRepository.get).toHaveBeenCalledWith({}, 'file-1', {});
  });

  it('never reads soft-deleted files, whatever the options hold', async () => {
    const options: FileGetOptionsInterface = { withDeleted: true };
    fileRepository.get.mockResolvedValue(createMockFile());

    await handler.execute(new GetFileDownloadQuery({}, 'file-1', options));

    const [[, , passed]] = fileRepository.get.mock.calls;
    expect(passed).not.toHaveProperty('withDeleted');
  });

  it('throws when nothing matches', async () => {
    fileRepository.get.mockResolvedValue(null);

    await expect(
      handler.execute(new GetFileDownloadQuery({}, 'missing')),
    ).rejects.toThrow(FileNotFoundException);
  });
});
