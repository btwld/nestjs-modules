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
  errorCode: string;
}[] = [
  {
    name: 'FileException (default)',
    errorCode: 'FILE_ERROR',
    build: () => new FileException(),
    fault: 'internal',
  },
  {
    name: 'FileStatusException',
    errorCode: 'FILE_STATUS_ERROR',
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
    errorCode: 'FILE_STORAGE_NOT_FOUND_ERROR',
    build: () => new FileStorageNotFoundException('key'),
    fault: 'usage',
  },
  {
    name: 'FileUploadPolicyException',
    errorCode: 'FILE_UPLOAD_POLICY_ERROR',
    build: () => new FileUploadPolicyException('size'),
    fault: 'client',
  },
  {
    name: 'FileUploadTargetException',
    errorCode: 'FILE_UPLOAD_TARGET_ERROR',
    build: () =>
      new FileUploadTargetException({ serviceKey: 'key', originalError: null }),
    fault: 'internal',
  },
  {
    name: 'FileDownloadUrlException',
    errorCode: 'FILE_DOWNLOAD_URL_ERROR',
    build: () =>
      new FileDownloadUrlException({ serviceKey: 'key', originalError: null }),
    fault: 'internal',
  },
  {
    name: 'FileStorageDeleteException',
    errorCode: 'FILE_STORAGE_DELETE_ERROR',
    build: () =>
      new FileStorageDeleteException({
        serviceKey: 'key',
        originalError: null,
      }),
    fault: 'internal',
  },
  {
    name: 'FileExistsCheckException',
    errorCode: 'FILE_EXISTS_CHECK_ERROR',
    build: () =>
      new FileExistsCheckException({ serviceKey: 'key', originalError: null }),
    fault: 'internal',
  },
  {
    name: 'FileNotFoundException',
    errorCode: 'FILE_NOT_FOUND_ERROR',
    build: () => new FileNotFoundException('id'),
    fault: 'client',
  },
  {
    name: 'FileNameInvalidException',
    errorCode: 'FILE_NAME_INVALID_ERROR',
    build: () => new FileNameInvalidException(),
    fault: 'client',
  },
  {
    name: 'FileNotUploadedException',
    errorCode: 'FILE_NOT_UPLOADED_ERROR',
    build: () => new FileNotUploadedException('id'),
    fault: 'client',
  },
  {
    name: 'FileRemoveException',
    errorCode: 'FILE_REMOVE_ERROR',
    build: () => new FileRemoveException({ id: 'id', originalError: null }),
    fault: 'internal',
  },
  {
    name: 'FileRemoveInTransactionException',
    errorCode: 'FILE_REMOVE_IN_TRANSACTION_ERROR',
    build: () => new FileRemoveInTransactionException(),
    fault: 'usage',
  },
  {
    name: 'FileScanResultInTransactionException',
    errorCode: 'FILE_SCAN_RESULT_IN_TRANSACTION_ERROR',
    build: () => new FileScanResultInTransactionException(),
    fault: 'usage',
  },
  {
    name: 'FileScanRequestException',
    errorCode: 'FILE_SCAN_REQUEST_ERROR',
    build: () =>
      new FileScanRequestException({ id: 'id', originalError: null }),
    fault: 'internal',
  },
  {
    name: 'FileRejectException',
    errorCode: 'FILE_REJECT_ERROR',
    build: () => new FileRejectException({ id: 'id', originalError: null }),
    fault: 'internal',
  },
];

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

describe('exception fault classification', () => {
  it.each(CASES)('$name has fault=$fault', ({ build, fault }) => {
    expect(build().fault).toEqual(fault);
  });

  it.each(CASES)('$name has errorCode=$errorCode', ({ build, errorCode }) => {
    expect(build().errorCode).toEqual(errorCode);
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
