import { mockDeep } from 'vitest-mock-extended';

import { type RepositoryInterface, Where } from '@concepta/nestjs-repository';

import {
  createMockFile,
  createMockFileEntity,
  STORAGE_KEY,
} from '../../../__tests__/helpers/mock.helpers.js';
import { FileMapper } from '../file.mapper.js';
import { FileRepository } from '../file.repository.js';
import { type FileEntityInterface } from '../interfaces/file-entity.interface.js';

describe(FileRepository.name, () => {
  const w = Where.for<FileEntityInterface>();
  const key = { serviceKey: STORAGE_KEY, fileName: 'docs/a.pdf' };

  let repository: ReturnType<
    typeof mockDeep<RepositoryInterface<FileEntityInterface>>
  >;
  let fileRepository: FileRepository;

  beforeEach(() => {
    repository = mockDeep<RepositoryInterface<FileEntityInterface>>();
    fileRepository = new FileRepository(repository, new FileMapper());
  });

  describe('get', () => {
    it('reads by id, without soft-deleted rows by default', async () => {
      repository.findOne.mockResolvedValue(createMockFileEntity());

      const file = await fileRepository.get({}, 'file-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: w.eq('id', 'file-1'),
        withDeleted: undefined,
        ctx: {},
      });
      expect(file?.id).toEqual('file-1');
    });

    it('adds the status filter and withDeleted', async () => {
      repository.findOne.mockResolvedValue(null);

      expect(
        await fileRepository.get({}, 'file-1', {
          status: ['removing'],
          withDeleted: true,
        }),
      ).toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith({
        where: w.and(w.eq('id', 'file-1'), w.in('status', ['removing'])),
        withDeleted: true,
        ctx: {},
      });
    });
  });

  it('findByKey never reads soft-deleted rows', async () => {
    repository.findOne.mockResolvedValue(null);

    await fileRepository.findByKey({}, key);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: w.and(
        w.eq('serviceKey', key.serviceKey),
        w.eq('fileName', key.fileName),
      ),
      ctx: {},
    });
  });

  it('existsByKey counts soft-deleted rows, as the unique constraint does', async () => {
    repository.count.mockResolvedValue(1);

    expect(await fileRepository.existsByKey({}, key)).toEqual(true);
    expect(repository.count).toHaveBeenCalledWith(
      expect.objectContaining({ withDeleted: true }),
    );
  });

  it('updateStatus stamps the file and uses the version-guarded update with only status and date', async () => {
    const file = createMockFile({ version: 3 });
    const readAt = file.meta.dateUpdated;
    file.markRemoving();
    repository.update.mockResolvedValue(
      createMockFileEntity({ status: 'removing', version: 4 }),
    );

    const stored = await fileRepository.updateStatus({}, file);

    const [[row, data]] = repository.update.mock.calls;
    expect(row.version).toEqual(3);
    expect(data).toEqual({
      status: 'removing',
      dateUpdated: file.meta.dateUpdated,
    });
    expect(file.meta.dateUpdated).not.toEqual(readAt);
    expect(repository.upsert).not.toHaveBeenCalled();
    expect(stored.version).toEqual(4);
  });

  it('softDelete hands the adapter the row as read, guarded on its version', async () => {
    const file = createMockFile({ version: 2 });
    repository.softDelete.mockResolvedValue(
      createMockFileEntity({ version: 3, dateDeleted: new Date() }),
    );

    const stored = await fileRepository.softDelete({}, file);

    const [[row, options]] = repository.softDelete.mock.calls;
    expect(row.dateDeleted).toBeNull();
    expect(options).toEqual({ expectedVersion: 2, ctx: {} });
    expect(stored.isSoftDeleted).toEqual(true);
  });

  it('restore and remove are guarded on the version read', async () => {
    const file = createMockFile({ version: 5, dateDeleted: new Date() });
    repository.restore.mockResolvedValue(createMockFileEntity({ version: 6 }));

    await fileRepository.restore({}, file);
    await fileRepository.remove({}, file);

    expect(repository.restore).toHaveBeenCalledWith(expect.anything(), {
      expectedVersion: 5,
      ctx: {},
    });
    expect(repository.delete).toHaveBeenCalledWith(expect.anything(), {
      expectedVersion: 5,
      ctx: {},
    });
  });
});
