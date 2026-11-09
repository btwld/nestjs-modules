import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { FileNotFoundException } from '../application/exceptions/file-not-found.exception.js';
import { FileRejectException } from '../application/exceptions/file-reject.exception.js';
import { FileRemoveInTransactionException } from '../application/exceptions/file-remove-in-transaction.exception.js';
import { FileRemoveException } from '../application/exceptions/file-remove.exception.js';
import { FileScanResultInTransactionException } from '../application/exceptions/file-scan-result-in-transaction.exception.js';
import { FileDownloadUrlException } from '../domain/exceptions/file-download-url.exception.js';
import { FileExistsCheckException } from '../domain/exceptions/file-exists-check.exception.js';
import { FileNameInvalidException } from '../domain/exceptions/file-name-invalid.exception.js';
import { FileNotUploadedException } from '../domain/exceptions/file-not-uploaded.exception.js';
import { FileScanRequestException } from '../domain/exceptions/file-scan-request.exception.js';
import { FileStatusException } from '../domain/exceptions/file-status.exception.js';
import { FileStorageDeleteException } from '../domain/exceptions/file-storage-delete.exception.js';
import { FileStorageNotFoundException } from '../domain/exceptions/file-storage-not-found.exception.js';
import { FileUploadPolicyException } from '../domain/exceptions/file-upload-policy.exception.js';
import { FileUploadTargetException } from '../domain/exceptions/file-upload-target.exception.js';
import { FileException } from '../domain/exceptions/file.exception.js';

/**
 * Anti-drift check: every `RuntimeException` subclass in this package states
 * an expected `fault` here.
 */
const CASES: {
  name: string;
  build: () => RuntimeException;
  fault: RuntimeExceptionFault;
}[] = [
  {
    name: 'FileException (default)',
    build: () => new FileException(),
    fault: 'internal',
  },
  {
    name: 'FileStatusException',
    build: () =>
      new FileStatusException({
        id: 'id',
        status: 'removing',
        action: 'confirm',
      }),
    fault: 'client',
  },
  {
    name: 'FileStorageNotFoundException',
    build: () => new FileStorageNotFoundException('key'),
    fault: 'usage',
  },
  {
    name: 'FileUploadPolicyException',
    build: () => new FileUploadPolicyException('size'),
    fault: 'client',
  },
  {
    name: 'FileUploadTargetException',
    build: () =>
      new FileUploadTargetException({ serviceKey: 'key', originalError: null }),
    fault: 'internal',
  },
  {
    name: 'FileDownloadUrlException',
    build: () =>
      new FileDownloadUrlException({ serviceKey: 'key', originalError: null }),
    fault: 'internal',
  },
  {
    name: 'FileStorageDeleteException',
    build: () =>
      new FileStorageDeleteException({
        serviceKey: 'key',
        originalError: null,
      }),
    fault: 'internal',
  },
  {
    name: 'FileExistsCheckException',
    build: () =>
      new FileExistsCheckException({ serviceKey: 'key', originalError: null }),
    fault: 'internal',
  },
  {
    name: 'FileNotFoundException',
    build: () => new FileNotFoundException('id'),
    fault: 'client',
  },
  {
    name: 'FileNameInvalidException',
    build: () => new FileNameInvalidException(),
    fault: 'client',
  },
  {
    name: 'FileNotUploadedException',
    build: () => new FileNotUploadedException('id'),
    fault: 'client',
  },
  {
    name: 'FileRemoveException',
    build: () => new FileRemoveException({ id: 'id', originalError: null }),
    fault: 'internal',
  },
  {
    name: 'FileRemoveInTransactionException',
    build: () => new FileRemoveInTransactionException(),
    fault: 'usage',
  },
  {
    name: 'FileScanResultInTransactionException',
    build: () => new FileScanResultInTransactionException(),
    fault: 'usage',
  },
  {
    name: 'FileScanRequestException',
    build: () =>
      new FileScanRequestException({ id: 'id', originalError: null }),
    fault: 'internal',
  },
  {
    name: 'FileRejectException',
    build: () => new FileRejectException({ id: 'id', originalError: null }),
    fault: 'internal',
  },
];

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

describe('exception fault classification', () => {
  it.each(CASES)('$name has fault=$fault', ({ build, fault }) => {
    expect(build().fault).toEqual(fault);
  });

  it('every RuntimeException subclass in this package is listed above', async () => {
    const discovered = await collectRuntimeExceptionClassNames(
      SRC_DIR,
      RuntimeException,
    );
    const expected = new Set(CASES.map((c) => c.build().constructor.name));
    const missing = discovered.filter((name) => !expected.has(name));
    expect(missing).toEqual([]);
  });
});
