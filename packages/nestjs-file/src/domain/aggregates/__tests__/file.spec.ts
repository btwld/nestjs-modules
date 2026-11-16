import { createTestEventContext } from '@concepta/nestjs-core/testing';

import { createMockFile } from '../../../__tests__/helpers/mock.helpers.js';
import { FileCreatedEvent } from '../../events/file-created.event.js';
import { FileRejectedEvent } from '../../events/file-rejected.event.js';
import { FileRemoveFailedEvent } from '../../events/file-remove-failed.event.js';
import { FileRemovedEvent } from '../../events/file-removed.event.js';
import { FileRestoredEvent } from '../../events/file-restored.event.js';
import { FileScanPassedEvent } from '../../events/file-scan-passed.event.js';
import { FileScanRetriedEvent } from '../../events/file-scan-retried.event.js';
import { FileSoftDeletedEvent } from '../../events/file-soft-deleted.event.js';
import { FileUploadConfirmedEvent } from '../../events/file-upload-confirmed.event.js';
import { FileNameInvalidException } from '../../exceptions/file-name-invalid.exception.js';
import { FileStatusException } from '../../exceptions/file-status.exception.js';
import { type FileScanAttempt } from '../../interfaces/file-scan-attempt.type.js';
import { type FileScanOutcomeInterface } from '../../interfaces/file-scan-outcome.interface.js';
import { type FileScanResult } from '../../interfaces/file-scan-result.type.js';
import { type FileStatus } from '../../interfaces/file-status.type.js';
import { File } from '../file.js';

describe(File.name, () => {
  const eventContext = createTestEventContext({}, {});

  it('creates a pending file and applies FileCreatedEvent', () => {
    const file = File.create(eventContext, {
      serviceKey: 's3',
      fileName: 'a.png',
      contentType: 'image/png',
      size: 1024,
    });

    expect(file.status).toEqual('pending');
    expect(file.size).toEqual(1024);
    expect(file.isSoftDeleted).toEqual(false);
    expect(file.getUncommittedEvents()).toEqual([
      new FileCreatedEvent(eventContext, file.toPlain()),
    ]);
  });

  it('stores the sanitized name', () => {
    const rightToLeftOverride = String.fromCodePoint(0x202e);
    const file = File.create(eventContext, {
      serviceKey: 's3',
      fileName: `../avatars/a${rightToLeftOverride}.png`,
      contentType: 'image/png',
      size: 1024,
    });

    expect(file.fileName).toEqual('a.png');
  });

  it('refuses a name with nothing left once sanitized', () => {
    expect(() =>
      File.create(eventContext, {
        serviceKey: 's3',
        fileName: 'avatars/',
        contentType: 'image/png',
        size: 1024,
      }),
    ).toThrow(FileNameInvalidException);
  });

  describe('confirmUpload', () => {
    it('moves pending to active without an event when nothing scans it', () => {
      const file = createMockFile({ status: 'pending' });

      file.confirmUpload({ scan: false });

      expect(file.status).toEqual('active');
      expect(file.getUncommittedEvents()).toEqual([]);
    });

    it('moves pending to scanning when a scanner checks it', () => {
      const file = createMockFile({ status: 'pending' });

      file.confirmUpload({ scan: true });

      expect(file.status).toEqual('scanning');
      expect(file.scanAttempt).toEqual(1);
    });

    it.each<FileStatus>([
      'scanning',
      'rescanning',
      'active',
      'rejecting',
      'rejected',
      'removing',
      'remove-failed',
    ])('refuses %s', (status) => {
      const file = createMockFile({ status });

      expect(() => file.confirmUpload({ scan: true })).toThrow(
        FileStatusException,
      );
      expect(file.status).toEqual(status);
    });
  });

  describe('uploadConfirmed', () => {
    it.each<FileStatus>(['scanning', 'active'])(
      'applies FileUploadConfirmedEvent to a %s file',
      (status) => {
        const file = createMockFile({ status, version: 2 });

        file.uploadConfirmed(eventContext);

        expect(file.getUncommittedEvents()).toEqual([
          new FileUploadConfirmedEvent(eventContext, file.toPlain()),
        ]);
      },
    );

    it('refuses a file that is not confirmed', () => {
      expect(() =>
        createMockFile({ status: 'pending' }).uploadConfirmed(eventContext),
      ).toThrow(FileStatusException);
    });
  });

  describe('recordScan', () => {
    it.each<[FileStatus, FileScanResult, FileStatus]>([
      ['scanning', 'clean', 'active'],
      ['scanning', 'uncertain', 'rescanning'],
      ['scanning', 'infected', 'rejecting'],
      ['rescanning', 'clean', 'active'],
      ['rescanning', 'uncertain', 'rejecting'],
      ['rescanning', 'infected', 'rejecting'],
    ])('moves %s with a %s result to %s', (from, result, to) => {
      const file = createMockFile({ status: from });

      file.recordScan(result);

      expect(file.status).toEqual(to);
      expect(file.getUncommittedEvents()).toEqual([]);
    });

    it.each<FileStatus>([
      'pending',
      'active',
      'rejecting',
      'rejected',
      'removing',
      'remove-failed',
    ])('refuses %s', (status) => {
      const file = createMockFile({ status });

      expect(() => file.recordScan('clean')).toThrow(FileStatusException);
      expect(file.status).toEqual(status);
    });
  });

  describe('assertScanRequested', () => {
    it('refuses a pending file', () => {
      expect(() =>
        createMockFile({ status: 'pending' }).assertScanRequested(),
      ).toThrow(FileStatusException);
    });

    it.each<FileStatus>([
      'scanning',
      'rescanning',
      'active',
      'rejecting',
      'rejected',
      'removing',
      'remove-failed',
    ])('allows %s', (status) => {
      expect(() =>
        createMockFile({ status }).assertScanRequested(),
      ).not.toThrow();
    });
  });

  describe('scanRecorded', () => {
    const scan: FileScanOutcomeInterface = {
      attempt: 2,
      result: 'uncertain',
    };

    it('applies FileScanPassedEvent to an active file', () => {
      const file = createMockFile({ status: 'active', version: 3 });

      file.scanRecorded(eventContext, { attempt: 1, result: 'clean' });

      expect(file.getUncommittedEvents()).toEqual([
        new FileScanPassedEvent(eventContext, file.toPlain()),
      ]);
    });

    it('applies FileScanRetriedEvent to a rescanning file', () => {
      const file = createMockFile({ status: 'rescanning', version: 3 });

      file.scanRecorded(eventContext, { attempt: 1, result: 'uncertain' });

      expect(file.getUncommittedEvents()).toEqual([
        new FileScanRetriedEvent(eventContext, file.toPlain()),
      ]);
    });

    it('applies FileRejectedEvent, with the deciding scan, to a rejecting file', () => {
      const file = createMockFile({ status: 'rejecting', version: 3 });

      file.scanRecorded(eventContext, scan);

      expect(file.getUncommittedEvents()).toEqual([
        new FileRejectedEvent(eventContext, file.toPlain(), scan),
      ]);
    });

    it.each<FileStatus>(['pending', 'scanning', 'rejected', 'removing'])(
      'refuses %s',
      (status) => {
        expect(() =>
          createMockFile({ status }).scanRecorded(eventContext, scan),
        ).toThrow(FileStatusException);
      },
    );
  });

  describe('markRejected', () => {
    it('moves rejecting to rejected', () => {
      const file = createMockFile({ status: 'rejecting' });

      file.markRejected();

      expect(file.status).toEqual('rejected');
    });

    it.each<FileStatus>(['scanning', 'rescanning', 'active', 'rejected'])(
      'refuses %s',
      (status) => {
        expect(() => createMockFile({ status }).markRejected()).toThrow(
          FileStatusException,
        );
      },
    );
  });

  it.each<[FileStatus, FileScanAttempt | undefined]>([
    ['pending', undefined],
    ['scanning', 1],
    ['rescanning', 2],
    ['active', undefined],
    ['rejecting', undefined],
    ['rejected', undefined],
  ])('scanAttempt is %s → %s', (status, expected) => {
    expect(createMockFile({ status }).scanAttempt).toEqual(expected);
  });

  it.each<[FileStatus, FileScanAttempt, boolean]>([
    ['rescanning', 1, true],
    ['rescanning', 2, false],
    ['scanning', 1, false],
    ['active', 1, false],
    ['rejecting', 1, false],
    ['pending', 1, false],
  ])(
    'isWaitingPast: a %s file, attempt %s → %s',
    (status, attempt, expected) => {
      expect(createMockFile({ status }).isWaitingPast(attempt)).toEqual(
        expected,
      );
    },
  );

  describe('markRemoving', () => {
    it.each<FileStatus>([
      'pending',
      'scanning',
      'rescanning',
      'active',
      'removing',
      'remove-failed',
    ])('is allowed from %s', (status) => {
      const file = createMockFile({ status });

      file.markRemoving();

      expect(file.status).toEqual('removing');
    });

    it.each<FileStatus>(['rejecting', 'rejected'])(
      'refuses a %s file, keeping its record',
      (status) => {
        const file = createMockFile({ status });

        expect(() => file.markRemoving()).toThrow(FileStatusException);
        expect(file.status).toEqual(status);
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
    ['scanning', true],
    ['rescanning', true],
    ['active', true],
    ['rejecting', true],
    ['rejected', true],
    ['removing', false],
    ['remove-failed', false],
  ])('isUploadConfirmed is %s → %s', (status, expected) => {
    expect(createMockFile({ status }).isUploadConfirmed).toEqual(expected);
  });

  describe('isDownloadable', () => {
    it.each<[FileStatus, boolean]>([
      ['pending', false],
      ['scanning', false],
      ['rescanning', false],
      ['active', true],
      ['rejecting', false],
      ['rejected', false],
      ['removing', false],
      ['remove-failed', false],
    ])('is %s → %s', (status, expected) => {
      expect(createMockFile({ status }).isDownloadable).toEqual(expected);
    });

    it('is false for a soft-deleted active file', () => {
      expect(
        createMockFile({ status: 'active', dateDeleted: new Date() })
          .isDownloadable,
      ).toEqual(false);
    });
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

    it.each<FileStatus>([
      'scanning',
      'rescanning',
      'rejecting',
      'rejected',
      'removing',
      'remove-failed',
    ])('refuses %s', (status) => {
      expect(() =>
        createMockFile({ status }).softDeleted(eventContext),
      ).toThrow(FileStatusException);
      expect(() => createMockFile({ status }).assertSoftDeletable()).toThrow(
        FileStatusException,
      );
    });
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

    file.confirmUpload({ scan: false });

    expect(file.meta).toEqual(meta);
  });

  it('reports isSoftDeleted from the delete date', () => {
    expect(createMockFile({ dateDeleted: new Date() }).isSoftDeleted).toEqual(
      true,
    );
  });
});
