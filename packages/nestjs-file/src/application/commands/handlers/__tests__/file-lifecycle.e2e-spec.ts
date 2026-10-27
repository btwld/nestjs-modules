import { type INestApplication } from '@nestjs/common';
import { CommandBus, EventBus, type IEvent, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import {
  OptimisticLockException,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { AppRepoModuleFixture } from '../../../../__tests__/fixtures/app-repo.module.fixture.js';
import {
  FakeStorageService,
  STORAGE_KEY,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { FileCreatedEvent } from '../../../../domain/events/file-created.event.js';
import { FileRemoveFailedEvent } from '../../../../domain/events/file-remove-failed.event.js';
import { FileRemovedEvent } from '../../../../domain/events/file-removed.event.js';
import { FileRestoredEvent } from '../../../../domain/events/file-restored.event.js';
import { FileSoftDeletedEvent } from '../../../../domain/events/file-soft-deleted.event.js';
import { FileUploadConfirmedEvent } from '../../../../domain/events/file-upload-confirmed.event.js';
import { FileAlreadyExistsException } from '../../../../domain/exceptions/file-already-exists.exception.js';
import { FileDownloadUrlException } from '../../../../domain/exceptions/file-download-url.exception.js';
import { FileStatusException } from '../../../../domain/exceptions/file-status.exception.js';
import { FileStorageDeleteException } from '../../../../domain/exceptions/file-storage-delete.exception.js';
import { FileUploadUrlException } from '../../../../domain/exceptions/file-upload-url.exception.js';
import { type FileRepositoryInterface } from '../../../../domain/repositories/file-repository.interface.js';
import { FILE_REPOSITORY_TOKEN } from '../../../../file.constants.js';
import { FileNotFoundException } from '../../../exceptions/file-not-found.exception.js';
import { FileRemoveInTransactionException } from '../../../exceptions/file-remove-in-transaction.exception.js';
import { FileRemoveException } from '../../../exceptions/file-remove.exception.js';
import { GetFileByKeyQuery } from '../../../queries/impl/get-file-by-key.query.js';
import { GetFileQuery } from '../../../queries/impl/get-file.query.js';
import { ConfirmFileUploadCommand } from '../../impl/confirm-file-upload.command.js';
import { CreateFileCommand } from '../../impl/create-file.command.js';
import { RemoveFileCommand } from '../../impl/remove-file.command.js';
import { RestoreFileCommand } from '../../impl/restore-file.command.js';
import { SoftDeleteFileCommand } from '../../impl/soft-delete-file.command.js';

describe('file lifecycle (e2e)', () => {
  const dto = {
    serviceKey: STORAGE_KEY,
    fileName: 'docs/a.pdf',
    contentType: 'application/pdf',
  };

  let app: INestApplication;
  let storage: FakeStorageService;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let fileRepository: FileRepositoryInterface;

  beforeEach(async () => {
    storage = new FakeStorageService();

    const moduleRef = await Test.createTestingModule({
      imports: [AppRepoModuleFixture.register(storage)],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    commandBus = app.get(CommandBus);
    queryBus = app.get(QueryBus);
    fileRepository = app.get<FileRepositoryInterface>(FILE_REPOSITORY_TOKEN);
  });

  afterEach(async () => {
    await app?.close();
  });

  async function createFile() {
    const { file } = await commandBus.execute(new CreateFileCommand({}, dto));
    return file;
  }

  it('creates, confirms, reads and removes a file', async () => {
    const created = await commandBus.execute(new CreateFileCommand({}, dto));
    expect(created.file.status).toEqual('pending');
    expect(created.signedUploadUrl).toEqual('https://upload.test/docs/a.pdf');

    const confirmed = await commandBus.execute(
      new ConfirmFileUploadCommand({}, created.file.id),
    );
    expect(confirmed.file.status).toEqual('active');

    const read = await queryBus.execute(
      new GetFileQuery({}, created.file.id, { status: ['active'] }),
    );
    expect(read.file.toPlain()).toEqual(confirmed.file.toPlain());
    expect(read.signedDownloadUrl).toEqual('https://download.test/docs/a.pdf');
    // Only create asked for an upload url.
    expect(storage.getSignedUploadUrl).toHaveBeenCalledTimes(1);

    await commandBus.execute(new RemoveFileCommand({}, created.file.id));

    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(
      await fileRepository.get({}, created.file.id, { withDeleted: true }),
    ).toBeNull();
  });

  it('filters reads by status', async () => {
    const file = await createFile();

    await expect(
      queryBus.execute(new GetFileQuery({}, file.id, { status: ['active'] })),
    ).rejects.toThrow(FileNotFoundException);
    expect(
      await queryBus.execute(
        new GetFileByKeyQuery({}, dto, { status: ['pending'] }),
      ),
    ).not.toBeNull();
  });

  it('refuses a duplicate key', async () => {
    await createFile();

    await expect(
      commandBus.execute(new CreateFileCommand({}, dto)),
    ).rejects.toThrow(FileAlreadyExistsException);
  });

  it('keeps a soft-deleted file key taken until it is removed', async () => {
    const file = await createFile();

    await commandBus.execute(new SoftDeleteFileCommand({}, file.id));

    expect(await queryBus.execute(new GetFileByKeyQuery({}, dto))).toBeNull();
    await expect(
      queryBus.execute(new GetFileQuery({}, file.id)),
    ).rejects.toThrow(FileNotFoundException);
    await expect(
      commandBus.execute(new CreateFileCommand({}, dto)),
    ).rejects.toThrow(FileAlreadyExistsException);

    await commandBus.execute(new RemoveFileCommand({}, file.id));

    const recreated = await createFile();
    expect(recreated.id).not.toEqual(file.id);
  });

  it('leaves remove-failed when storage fails, and a retry finishes', async () => {
    const file = await createFile();
    const storageError = new Error('denied');
    storage.delete?.mockRejectedValueOnce(storageError);

    const error = await commandBus
      .execute(new RemoveFileCommand({}, file.id))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FileRemoveException);
    expect(error).toHaveProperty(
      'cause',
      expect.any(FileStorageDeleteException),
    );
    expect(error).toHaveProperty('cause.cause', storageError);

    const failed = await fileRepository.get({}, file.id);
    expect(failed?.status).toEqual('remove-failed');

    await commandBus.execute(new RemoveFileCommand({}, file.id));

    expect(await fileRepository.get({}, file.id)).toBeNull();
  });

  it('soft delete returns the file as stored', async () => {
    const file = await createFile();

    const deleted = await commandBus.execute(
      new SoftDeleteFileCommand({}, file.id),
    );

    const stored = await fileRepository.get({}, file.id, {
      withDeleted: true,
    });
    expect(deleted.isSoftDeleted).toEqual(true);
    expect(deleted.toPlain()).toEqual(stored?.toPlain());
  });

  it('restore brings a soft-deleted file back into reads', async () => {
    const file = await createFile();
    await commandBus.execute(new SoftDeleteFileCommand({}, file.id));

    const restored = await commandBus.execute(
      new RestoreFileCommand({}, file.id),
    );

    const read = await queryBus.execute(new GetFileQuery({}, file.id));
    expect(restored.isSoftDeleted).toEqual(false);
    expect(read.file.toPlain()).toEqual(restored.toPlain());
  });

  it('refuses to soft-delete a file whose removal failed', async () => {
    const file = await createFile();
    storage.delete?.mockRejectedValueOnce(new Error('denied'));
    await expect(
      commandBus.execute(new RemoveFileCommand({}, file.id)),
    ).rejects.toThrow(FileRemoveException);

    await expect(
      commandBus.execute(new SoftDeleteFileCommand({}, file.id)),
    ).rejects.toThrow(FileStatusException);
  });

  it('leaves a soft-deleted file untouched when its removal fails, and a retry finishes', async () => {
    const file = await createFile();
    const deleted = await commandBus.execute(
      new SoftDeleteFileCommand({}, file.id),
    );
    storage.delete?.mockRejectedValueOnce(new Error('denied'));

    await expect(
      commandBus.execute(new RemoveFileCommand({}, file.id)),
    ).rejects.toThrow(FileRemoveException);

    const stored = await fileRepository.get({}, file.id, {
      withDeleted: true,
    });
    expect(stored?.toPlain()).toEqual(deleted.toPlain());

    await commandBus.execute(new RemoveFileCommand({}, file.id));

    expect(
      await fileRepository.get({}, file.id, { withDeleted: true }),
    ).toBeNull();
  });

  it('deletes a soft-deleted file once when two removals race', async () => {
    const events: IEvent[] = [];
    app.get(EventBus).subscribe((event) => events.push(event));
    const file = await createFile();
    await commandBus.execute(new SoftDeleteFileCommand({}, file.id));

    // The first removal's storage delete hangs until released; a second
    // removal runs to the end meanwhile.
    let releaseFirst: (() => void) | undefined;
    storage.delete?.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseFirst = resolve;
        }),
    );

    const first = commandBus
      .execute(new RemoveFileCommand({}, file.id))
      .catch((e: unknown) => e);
    await vi.waitFor(() => expect(releaseFirst).toBeDefined());

    await commandBus.execute(new RemoveFileCommand({}, file.id));
    releaseFirst?.();

    expect(await first).toBeInstanceOf(OptimisticLockException);
    expect(
      events.filter((event) => event instanceof FileRemovedEvent),
    ).toHaveLength(1);
  });

  it('marks a file restored during its removal remove-failed, and a retry finishes', async () => {
    const file = await createFile();
    await commandBus.execute(new SoftDeleteFileCommand({}, file.id));

    // The removal's storage delete hangs until released; the file is
    // restored meanwhile, so its object is deleted under a live row.
    let release: (() => void) | undefined;
    storage.delete?.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const removal = commandBus
      .execute(new RemoveFileCommand({}, file.id))
      .catch((e: unknown) => e);
    await vi.waitFor(() => expect(release).toBeDefined());

    await commandBus.execute(new RestoreFileCommand({}, file.id));
    release?.();

    expect(await removal).toBeInstanceOf(OptimisticLockException);
    const stored = await fileRepository.get({}, file.id);
    expect(stored?.status).toEqual('remove-failed');

    await commandBus.execute(new RemoveFileCommand({}, file.id));

    expect(
      await fileRepository.get({}, file.id, { withDeleted: true }),
    ).toBeNull();
  });

  it('leaves nothing behind when create cannot get a signed url', async () => {
    const events: IEvent[] = [];
    app.get(EventBus).subscribe((event) => events.push(event));
    storage.getSignedUploadUrl.mockRejectedValueOnce(new Error('s3 down'));

    await expect(
      commandBus.execute(new CreateFileCommand({}, dto)),
    ).rejects.toThrow(FileUploadUrlException);

    expect(await queryBus.execute(new GetFileByKeyQuery({}, dto))).toBeNull();
    expect(events).toEqual([]);
  });

  it('leaves the file pending when confirm cannot get a signed url', async () => {
    const file = await createFile();
    const events: IEvent[] = [];
    app.get(EventBus).subscribe((event) => events.push(event));
    storage.getSignedDownloadUrl.mockRejectedValueOnce(new Error('s3 down'));

    await expect(
      commandBus.execute(new ConfirmFileUploadCommand({}, file.id)),
    ).rejects.toThrow(FileDownloadUrlException);

    const stored = await fileRepository.get({}, file.id);
    expect(stored?.status).toEqual('pending');
    expect(stored?.version).toEqual(1);
    expect(events).toEqual([]);
  });

  it('publishes each event once its command commits', async () => {
    const events: IEvent[] = [];
    app.get(EventBus).subscribe((event) => events.push(event));

    const file = await createFile();
    await commandBus.execute(new ConfirmFileUploadCommand({}, file.id));
    await commandBus.execute(new SoftDeleteFileCommand({}, file.id));
    await commandBus.execute(new RestoreFileCommand({}, file.id));
    await commandBus.execute(new RemoveFileCommand({}, file.id));

    expect(events.map((event) => event.constructor)).toEqual([
      FileCreatedEvent,
      FileUploadConfirmedEvent,
      FileSoftDeletedEvent,
      FileRestoredEvent,
      FileRemovedEvent,
    ]);
    // Each event carries the file as stored by its command.
    expect(events[1]).toHaveProperty('file.version', 2);
  });

  it('publishes FileRemoveFailedEvent, not FileRemovedEvent, when storage fails', async () => {
    const events: IEvent[] = [];
    app.get(EventBus).subscribe((event) => events.push(event));
    const file = await createFile();
    storage.delete?.mockRejectedValueOnce(new Error('denied'));

    await expect(
      commandBus.execute(new RemoveFileCommand({}, file.id)),
    ).rejects.toThrow(FileRemoveException);

    expect(events.map((event) => event.constructor)).toEqual([
      FileCreatedEvent,
      FileRemoveFailedEvent,
    ]);
    expect(events[1]).toHaveProperty('file.status', 'remove-failed');
  });

  it('publishes FileRemoveFailedEvent for a file restored during its removal', async () => {
    const file = await createFile();
    await commandBus.execute(new SoftDeleteFileCommand({}, file.id));
    const events: IEvent[] = [];
    app.get(EventBus).subscribe((event) => events.push(event));

    let release: (() => void) | undefined;
    storage.delete?.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const removal = commandBus
      .execute(new RemoveFileCommand({}, file.id))
      .catch((e: unknown) => e);
    await vi.waitFor(() => expect(release).toBeDefined());

    await commandBus.execute(new RestoreFileCommand({}, file.id));
    release?.();
    await removal;

    expect(events.map((event) => event.constructor)).toEqual([
      FileRestoredEvent,
      FileRemoveFailedEvent,
    ]);
  });

  it('publishes nothing for a soft-deleted file whose removal fails', async () => {
    const file = await createFile();
    await commandBus.execute(new SoftDeleteFileCommand({}, file.id));
    const events: IEvent[] = [];
    app.get(EventBus).subscribe((event) => events.push(event));
    storage.delete?.mockRejectedValueOnce(new Error('denied'));

    const error = await commandBus
      .execute(new RemoveFileCommand({}, file.id))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FileRemoveException);
    // Skipped on purpose, not refused: no status write was attempted.
    expect(error).not.toHaveProperty('context.statusError');
    expect(events).toEqual([]);
  });

  it('refuses removal inside a transaction', async () => {
    const file = await createFile();
    const txScope = app.get(TransactionScope);

    await expect(
      txScope.run({}, (txCtx) =>
        commandBus.execute(new RemoveFileCommand(txCtx, file.id)),
      ),
    ).rejects.toThrow(FileRemoveInTransactionException);
    expect(storage.delete).not.toHaveBeenCalled();
  });

  describe('version guard', () => {
    it('refuses a status write from a stale read', async () => {
      const file = await createFile();
      const first = await fileRepository.get({}, file.id);
      const second = await fileRepository.get({}, file.id);
      if (!first || !second) throw new Error('file not found');

      first.markRemoving();
      await fileRepository.updateStatus({}, first);

      second.markRemoving();
      await expect(fileRepository.updateStatus({}, second)).rejects.toThrow(
        OptimisticLockException,
      );
    });

    it('refuses a row delete from a stale read', async () => {
      const file = await createFile();
      const stale = await fileRepository.get({}, file.id);
      const current = await fileRepository.get({}, file.id);
      if (!stale || !current) throw new Error('file not found');

      current.markRemoving();
      await fileRepository.updateStatus({}, current);

      await expect(fileRepository.remove({}, stale)).rejects.toThrow(
        OptimisticLockException,
      );
    });

    it('refuses a soft delete from a stale read', async () => {
      const file = await createFile();
      const stale = await fileRepository.get({}, file.id);
      const current = await fileRepository.get({}, file.id);
      if (!stale || !current) throw new Error('file not found');

      current.markRemoving();
      await fileRepository.updateStatus({}, current);

      await expect(fileRepository.softDelete({}, stale)).rejects.toThrow(
        OptimisticLockException,
      );
    });

    it('refuses a restore from a stale read', async () => {
      const file = await createFile();
      const deleted = await fileRepository.softDelete({}, file);
      const stale = await fileRepository.get({}, file.id, {
        withDeleted: true,
      });
      if (!stale) throw new Error('file not found');

      await fileRepository.restore({}, deleted);

      // `stale` is soft-deleted at the version the restore advanced past.
      await expect(fileRepository.restore({}, stale)).rejects.toThrow(
        OptimisticLockException,
      );
    });
  });
});
