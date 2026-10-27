import { EventContextHost } from '@concepta/nestjs-core';

import {
  createMockFile,
  createMockFileRepository,
  FakeStorageService,
  STORAGE_KEY,
} from '../../../__tests__/helpers/mock.helpers.js';
import { File } from '../../aggregates/file.js';
import { FileCreatedEvent } from '../../events/file-created.event.js';
import { FileRemoveFailedEvent } from '../../events/file-remove-failed.event.js';
import { FileRemovedEvent } from '../../events/file-removed.event.js';
import { FileRestoredEvent } from '../../events/file-restored.event.js';
import { FileSoftDeletedEvent } from '../../events/file-soft-deleted.event.js';
import { FileUploadConfirmedEvent } from '../../events/file-upload-confirmed.event.js';
import { FileAlreadyExistsException } from '../../exceptions/file-already-exists.exception.js';
import { FileNotUploadedException } from '../../exceptions/file-not-uploaded.exception.js';
import { FileStatusException } from '../../exceptions/file-status.exception.js';
import { FileStorageNotFoundException } from '../../exceptions/file-storage-not-found.exception.js';
import { FileLifecycleService } from '../file-lifecycle.service.js';
import { FileStorageService } from '../file-storage.service.js';

describe(FileLifecycleService.name, () => {
  const dto = {
    serviceKey: STORAGE_KEY,
    fileName: 'docs/a.pdf',
    contentType: 'application/pdf',
  };

  let fileRepository: ReturnType<typeof createMockFileRepository>;
  let storage: FakeStorageService;
  let service: FileLifecycleService;

  beforeEach(() => {
    fileRepository = createMockFileRepository();
    // As the repository does: every write advances the version, and soft
    // delete and restore set and clear the delete date.
    fileRepository.updateStatus.mockImplementation(async (_ctx, file) =>
      createMockFile({ status: file.status, version: file.version + 1 }),
    );
    fileRepository.restore.mockImplementation(async (_ctx, file) =>
      createMockFile({ status: file.status, version: file.version + 1 }),
    );
    fileRepository.softDelete.mockImplementation(async (_ctx, file) =>
      createMockFile({
        status: file.status,
        version: file.version + 1,
        dateDeleted: new Date('2026-02-01'),
      }),
    );
    storage = new FakeStorageService();
    service = new FileLifecycleService(
      fileRepository,
      new FileStorageService([storage]),
    );
  });

  describe('create', () => {
    it('writes a pending file with FileCreatedEvent applied', async () => {
      fileRepository.existsByKey.mockResolvedValue(false);

      const file = await service.create({}, dto);

      expect(file).toBeInstanceOf(File);
      expect(file.status).toEqual('pending');
      expect(fileRepository.create).toHaveBeenCalledWith({}, file);
      expect(file.getUncommittedEvents()).toEqual([
        new FileCreatedEvent(expect.any(EventContextHost), file.toPlain()),
      ]);
    });

    it('refuses a taken name before writing', async () => {
      fileRepository.existsByKey.mockResolvedValue(true);

      await expect(service.create({}, dto)).rejects.toThrow(
        FileAlreadyExistsException,
      );
      expect(fileRepository.create).not.toHaveBeenCalled();
    });

    it('refuses an unknown storage key before reading', async () => {
      await expect(
        service.create({}, { ...dto, serviceKey: 'unknown' }),
      ).rejects.toThrow(FileStorageNotFoundException);
      expect(fileRepository.existsByKey).not.toHaveBeenCalled();
    });
  });

  describe('confirmUpload', () => {
    it('confirms a pending file and applies the event to the file as stored', async () => {
      fileRepository.get.mockResolvedValue(createMockFile());

      const stored = await service.confirmUpload({}, 'file-1');

      expect(stored?.status).toEqual('active');
      expect(stored?.version).toEqual(2);
      const [event] = stored?.getUncommittedEvents() ?? [];
      expect(event).toBeInstanceOf(FileUploadConfirmedEvent);
      expect(event).toHaveProperty('file.version', 2);
    });

    it('asks storage about the file while it is still pending', async () => {
      fileRepository.get.mockResolvedValue(createMockFile());

      await service.confirmUpload({}, 'file-1');

      const [[, asked]] = storage.exists?.mock.calls ?? [];
      expect(asked).toHaveProperty('status', 'pending');
    });

    it('refuses a file storage does not have, before writing', async () => {
      fileRepository.get.mockResolvedValue(createMockFile());
      storage.exists?.mockResolvedValue(false);

      await expect(service.confirmUpload({}, 'file-1')).rejects.toThrow(
        FileNotUploadedException,
      );
      expect(fileRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('confirms without asking storage when it has no exists', async () => {
      delete storage.exists;
      fileRepository.get.mockResolvedValue(createMockFile());

      const stored = await service.confirmUpload({}, 'file-1');

      expect(stored?.status).toEqual('active');
    });

    it('returns an active file unchanged', async () => {
      const active = createMockFile({ status: 'active' });
      fileRepository.get.mockResolvedValue(active);

      expect(await service.confirmUpload({}, 'file-1')).toBe(active);
      expect(fileRepository.updateStatus).not.toHaveBeenCalled();
      expect(storage.exists).not.toHaveBeenCalled();
    });

    it('refuses a file that is being removed, before asking storage', async () => {
      fileRepository.get.mockResolvedValue(
        createMockFile({ status: 'removing' }),
      );

      await expect(service.confirmUpload({}, 'file-1')).rejects.toThrow(
        FileStatusException,
      );
      expect(storage.exists).not.toHaveBeenCalled();
    });

    it('returns null when the file does not exist', async () => {
      fileRepository.get.mockResolvedValue(null);

      expect(await service.confirmUpload({}, 'missing')).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('returns the file as stored, with the event carrying the delete date', async () => {
      const existing = createMockFile({ status: 'active' });
      fileRepository.get.mockResolvedValue(existing);

      const stored = await service.softDelete({}, 'file-1');

      expect(fileRepository.softDelete).toHaveBeenCalledWith({}, existing);
      expect(stored?.isSoftDeleted).toEqual(true);
      const [event] = stored?.getUncommittedEvents() ?? [];
      expect(event).toBeInstanceOf(FileSoftDeletedEvent);
      expect(event).toHaveProperty(
        'file.dateDeleted',
        stored?.meta.dateDeleted,
      );
    });

    it.each(['removing', 'remove-failed'] as const)(
      'refuses a file that is %s, before writing',
      async (status) => {
        fileRepository.get.mockResolvedValue(createMockFile({ status }));

        await expect(service.softDelete({}, 'file-1')).rejects.toThrow(
          FileStatusException,
        );
        expect(fileRepository.softDelete).not.toHaveBeenCalled();
      },
    );

    it('returns null when the file does not exist', async () => {
      fileRepository.get.mockResolvedValue(null);

      expect(await service.softDelete({}, 'missing')).toBeNull();
    });
  });

  describe('restore', () => {
    it('restores a soft-deleted file and applies FileRestoredEvent to it as stored', async () => {
      const deleted = createMockFile({
        status: 'active',
        dateDeleted: new Date(),
      });
      fileRepository.get.mockResolvedValue(deleted);

      const stored = await service.restore({}, 'file-1');

      expect(fileRepository.get).toHaveBeenCalledWith({}, 'file-1', {
        withDeleted: true,
      });
      expect(fileRepository.restore).toHaveBeenCalledWith({}, deleted);
      expect(stored?.isSoftDeleted).toEqual(false);
      const [event] = stored?.getUncommittedEvents() ?? [];
      expect(event).toBeInstanceOf(FileRestoredEvent);
      expect(event).toHaveProperty('file.version', 2);
    });

    it('returns a file that is not soft-deleted unchanged', async () => {
      const live = createMockFile({ status: 'active' });
      fileRepository.get.mockResolvedValue(live);

      expect(await service.restore({}, 'file-1')).toBe(live);
      expect(fileRepository.restore).not.toHaveBeenCalled();
      expect(live.getUncommittedEvents()).toEqual([]);
    });

    it('returns null when the file does not exist', async () => {
      fileRepository.get.mockResolvedValue(null);

      expect(await service.restore({}, 'missing')).toBeNull();
    });
  });

  describe('beginRemoval', () => {
    it('reads soft-deleted files too and writes removing', async () => {
      fileRepository.get.mockResolvedValue(
        createMockFile({ status: 'active' }),
      );

      const removing = await service.beginRemoval({}, 'file-1');

      expect(fileRepository.get).toHaveBeenCalledWith({}, 'file-1', {
        withDeleted: true,
      });
      expect(removing?.status).toEqual('removing');
      expect(removing?.version).toEqual(2);
    });

    it('rewrites removing on a retry, so the version advances', async () => {
      fileRepository.get.mockResolvedValue(
        createMockFile({ status: 'removing' }),
      );

      await service.beginRemoval({}, 'file-1');

      expect(fileRepository.updateStatus).toHaveBeenCalledTimes(1);
    });

    it('returns a soft-deleted file as it is, without writing', async () => {
      const deleted = createMockFile({
        status: 'active',
        dateDeleted: new Date('2026-02-01'),
      });
      fileRepository.get.mockResolvedValue(deleted);

      expect(await service.beginRemoval({}, 'file-1')).toBe(deleted);
      expect(deleted.status).toEqual('active');
      expect(fileRepository.updateStatus).not.toHaveBeenCalled();
      expect(fileRepository.restore).not.toHaveBeenCalled();
    });

    it('refuses an unknown storage key on a soft-deleted file', async () => {
      fileRepository.get.mockResolvedValue(
        createMockFile({ serviceKey: 'unknown', dateDeleted: new Date() }),
      );

      await expect(service.beginRemoval({}, 'file-1')).rejects.toThrow(
        FileStorageNotFoundException,
      );
    });

    it('refuses an unknown storage key before writing', async () => {
      fileRepository.get.mockResolvedValue(
        createMockFile({ serviceKey: 'unknown' }),
      );

      await expect(service.beginRemoval({}, 'file-1')).rejects.toThrow(
        FileStorageNotFoundException,
      );
      expect(fileRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('returns null when the file does not exist', async () => {
      fileRepository.get.mockResolvedValue(null);

      expect(await service.beginRemoval({}, 'missing')).toBeNull();
    });
  });

  describe('failRemoval', () => {
    it('writes remove-failed and applies FileRemoveFailedEvent to the file as stored', async () => {
      const stored = await service.failRemoval(
        {},
        createMockFile({ status: 'removing' }),
      );

      if (!stored) throw new Error('file not stored');

      const [[, written]] = fileRepository.updateStatus.mock.calls;
      expect(written.status).toEqual('remove-failed');
      expect(stored.getUncommittedEvents()).toEqual([
        new FileRemoveFailedEvent(
          expect.any(EventContextHost),
          stored.toPlain(),
        ),
      ]);
    });

    it('leaves a soft-deleted file as it is', async () => {
      const deleted = createMockFile({
        status: 'active',
        dateDeleted: new Date(),
      });

      expect(await service.failRemoval({}, deleted)).toBeNull();
      expect(deleted.status).toEqual('active');
      expect(fileRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('failRestoredRemoval', () => {
    const removing = createMockFile({
      status: 'active',
      dateDeleted: new Date(),
    });

    it.each(['pending', 'active'] as const)(
      'writes remove-failed on a file restored while %s',
      async (status) => {
        fileRepository.get.mockResolvedValue(
          createMockFile({ status, version: 2 }),
        );

        const stored = await service.failRestoredRemoval({}, removing);

        expect(fileRepository.get).toHaveBeenCalledWith({}, removing.id, {
          withDeleted: true,
        });
        const [[, written]] = fileRepository.updateStatus.mock.calls;
        expect(written.status).toEqual('remove-failed');
        expect(written.version).toEqual(2);
        const [event] = stored?.getUncommittedEvents() ?? [];
        expect(event).toBeInstanceOf(FileRemoveFailedEvent);
      },
    );

    it.each([
      ['gone', null],
      ['soft-deleted again', createMockFile({ dateDeleted: new Date() })],
      ['being removed', createMockFile({ status: 'removing' })],
      ['already remove-failed', createMockFile({ status: 'remove-failed' })],
    ])('leaves a row that is %s alone', async (_name, current) => {
      fileRepository.get.mockResolvedValue(current);

      expect(await service.failRestoredRemoval({}, removing)).toBeNull();
      expect(fileRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  it('deleteStoredObject asks storage to delete the object', async () => {
    const file = createMockFile({ status: 'removing' });

    await service.deleteStoredObject({}, file);

    expect(storage.delete).toHaveBeenCalledWith({}, file.toPlain());
  });

  it('finishRemoval deletes the row and applies FileRemovedEvent', async () => {
    const file = createMockFile({ status: 'removing', version: 2 });

    await service.finishRemoval({}, file);

    expect(fileRepository.remove).toHaveBeenCalledWith({}, file);
    expect(file.getUncommittedEvents()).toEqual([
      new FileRemovedEvent(expect.any(EventContextHost), file.toPlain()),
    ]);
  });
});
