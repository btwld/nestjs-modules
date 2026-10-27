import { createTestEventContext } from '@concepta/nestjs-core/testing';

import { createMockFile } from '../../../__tests__/helpers/mock.helpers.js';
import { FileCreatedEvent } from '../../events/file-created.event.js';
import { FileRemoveFailedEvent } from '../../events/file-remove-failed.event.js';
import { FileRemovedEvent } from '../../events/file-removed.event.js';
import { FileRestoredEvent } from '../../events/file-restored.event.js';
import { FileSoftDeletedEvent } from '../../events/file-soft-deleted.event.js';
import { FileUploadConfirmedEvent } from '../../events/file-upload-confirmed.event.js';
import { FileStatusException } from '../../exceptions/file-status.exception.js';
import { type FileStatus } from '../../interfaces/file-status.type.js';
import { File } from '../file.js';

describe(File.name, () => {
  const eventContext = createTestEventContext({}, {});

  it('creates a pending file and applies FileCreatedEvent', () => {
    const file = File.create(eventContext, {
      serviceKey: 's3',
      fileName: 'a.png',
      contentType: 'image/png',
    });

    expect(file.status).toEqual('pending');
    expect(file.isSoftDeleted).toEqual(false);
    expect(file.getUncommittedEvents()).toEqual([
      new FileCreatedEvent(eventContext, file.toPlain()),
    ]);
  });

  describe('confirmUpload', () => {
    it('moves pending to active without an event', () => {
      const file = createMockFile({ status: 'pending' });

      file.confirmUpload();

      expect(file.status).toEqual('active');
      expect(file.getUncommittedEvents()).toEqual([]);
    });

    it.each<FileStatus>(['active', 'removing', 'remove-failed'])(
      'refuses %s',
      (status) => {
        const file = createMockFile({ status });

        expect(() => file.confirmUpload()).toThrow(FileStatusException);
        expect(file.status).toEqual(status);
      },
    );
  });

  describe('uploadConfirmed', () => {
    it('applies FileUploadConfirmedEvent to an active file', () => {
      const file = createMockFile({ status: 'active', version: 2 });

      file.uploadConfirmed(eventContext);

      expect(file.getUncommittedEvents()).toEqual([
        new FileUploadConfirmedEvent(eventContext, file.toPlain()),
      ]);
    });

    it('refuses a file that is not active', () => {
      expect(() =>
        createMockFile({ status: 'pending' }).uploadConfirmed(eventContext),
      ).toThrow(FileStatusException);
    });
  });

  describe('markRemoving', () => {
    it.each<FileStatus>(['pending', 'active', 'removing', 'remove-failed'])(
      'is allowed from %s',
      (status) => {
        const file = createMockFile({ status });

        file.markRemoving();

        expect(file.status).toEqual('removing');
      },
    );

    it('leaves the version for the repository to advance', () => {
      const file = createMockFile({ version: 3 });

      file.markRemoving();

      expect(file.version).toEqual(3);
    });
  });

  describe('markRemoveFailed', () => {
    it.each<FileStatus>(['removing', 'pending', 'active'])(
      'moves %s to remove-failed',
      (status) => {
        const file = createMockFile({ status });

        file.markRemoveFailed();

        expect(file.status).toEqual('remove-failed');
      },
    );

    it('refuses remove-failed', () => {
      expect(() =>
        createMockFile({ status: 'remove-failed' }).markRemoveFailed(),
      ).toThrow(FileStatusException);
    });
  });

  describe('removeFailed', () => {
    it('applies FileRemoveFailedEvent to a remove-failed file', () => {
      const file = createMockFile({ status: 'remove-failed' });

      file.removeFailed(eventContext);

      expect(file.getUncommittedEvents()).toEqual([
        new FileRemoveFailedEvent(eventContext, file.toPlain()),
      ]);
    });

    it('refuses a file that is not remove-failed', () => {
      expect(() =>
        createMockFile({ status: 'removing' }).removeFailed(eventContext),
      ).toThrow(FileStatusException);
    });
  });

  it.each<[FileStatus, boolean]>([
    ['pending', false],
    ['active', true],
    ['removing', false],
    ['remove-failed', false],
  ])('isUploadConfirmed is %s → %s', (status, expected) => {
    expect(createMockFile({ status }).isUploadConfirmed).toEqual(expected);
  });

  describe('removed', () => {
    it('applies FileRemovedEvent while removing', () => {
      const file = createMockFile({ status: 'removing' });

      file.removed(eventContext);

      expect(file.getUncommittedEvents()).toEqual([
        new FileRemovedEvent(eventContext, file.toPlain()),
      ]);
    });

    it.each<FileStatus>(['pending', 'active', 'remove-failed'])(
      'refuses a live file that is %s',
      (status) => {
        expect(() => createMockFile({ status }).removed(eventContext)).toThrow(
          FileStatusException,
        );
      },
    );

    it.each<FileStatus>(['pending', 'active'])(
      'applies FileRemovedEvent to a soft-deleted file that is %s',
      (status) => {
        const file = createMockFile({ status, dateDeleted: new Date() });

        file.removed(eventContext);

        expect(file.getUncommittedEvents()).toEqual([
          new FileRemovedEvent(eventContext, file.toPlain()),
        ]);
      },
    );
  });

  describe('softDeleted', () => {
    it('applies FileSoftDeletedEvent', () => {
      const file = createMockFile({
        status: 'active',
        dateDeleted: new Date(),
      });

      file.softDeleted(eventContext);

      expect(file.getUncommittedEvents()).toEqual([
        new FileSoftDeletedEvent(eventContext, file.toPlain()),
      ]);
    });

    it.each<FileStatus>(['removing', 'remove-failed'])(
      'refuses %s',
      (status) => {
        expect(() =>
          createMockFile({ status }).softDeleted(eventContext),
        ).toThrow(FileStatusException);
      },
    );
  });

  it('restored applies FileRestoredEvent', () => {
    const file = createMockFile({ status: 'active' });

    file.restored(eventContext);

    expect(file.getUncommittedEvents()).toEqual([
      new FileRestoredEvent(eventContext, file.toPlain()),
    ]);
  });

  describe('isInUse', () => {
    it.each<FileStatus>(['pending', 'active'])('is true when %s', (status) => {
      expect(createMockFile({ status }).isInUse).toEqual(true);
    });

    it.each<FileStatus>(['removing', 'remove-failed'])(
      'is false when %s',
      (status) => {
        expect(createMockFile({ status }).isInUse).toEqual(false);
      },
    );

    it('is false when soft-deleted', () => {
      expect(
        createMockFile({ status: 'active', dateDeleted: new Date() }).isInUse,
      ).toEqual(false);
    });
  });

  it('leaves the dates and version to the repository', () => {
    const file = createMockFile({ status: 'pending', version: 3 });
    const meta = file.meta;

    file.confirmUpload();

    expect(file.meta).toEqual(meta);
  });

  it('reports isSoftDeleted from the delete date', () => {
    expect(createMockFile({ dateDeleted: new Date() }).isSoftDeleted).toEqual(
      true,
    );
  });
});
