import { type Mock } from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type PlainLiteralObject } from '@nestjs/common';

import { createMockEventPublisher } from '@concepta/nestjs-core/testing';
import { createMockTransaction } from '@concepta/nestjs-repository/testing';

import { type File } from '../../domain/aggregates/file.js';
import { type FileStorageServiceInterface } from '../../domain/interfaces/file-storage-service.interface.js';
import { type FileInterface } from '../../domain/interfaces/file.interface.js';
import { type FileRepositoryInterface } from '../../domain/repositories/file-repository.interface.js';
import { type FileLifecycleService } from '../../domain/services/file-lifecycle.service.js';
import { FileMapper } from '../../infrastructure/persistence/file.mapper.js';
import { type FileEntityInterface } from '../../infrastructure/persistence/interfaces/file-entity.interface.js';

export { createMockEventPublisher, createMockTransaction };

export const STORAGE_KEY = 'fake-storage';

/**
 * A storage service whose every method is a mock, with all four methods
 * implemented. Delete `exists` or `delete` from an instance to test a
 * service that leaves them out.
 */
export class FakeStorageService implements FileStorageServiceInterface {
  KEY = STORAGE_KEY;

  getSignedUploadUrl: Mock<
    (ctx: PlainLiteralObject, file: FileInterface) => Promise<string>
  > = vi.fn(async (_ctx, file) => `https://upload.test/${file.fileName}`);

  getSignedDownloadUrl: Mock<
    (ctx: PlainLiteralObject, file: FileInterface) => Promise<string>
  > = vi.fn(async (_ctx, file) => `https://download.test/${file.fileName}`);

  exists?: Mock<
    (ctx: PlainLiteralObject, file: FileInterface) => Promise<boolean>
  > = vi.fn(async () => true);

  delete?: Mock<
    (ctx: PlainLiteralObject, file: FileInterface) => Promise<void>
  > = vi.fn(async () => {});
}

export function createMockFileRepository(): DeepMockProxy<FileRepositoryInterface> {
  return mockDeep<FileRepositoryInterface>();
}

export function createMockFileLifecycle(): DeepMockProxy<FileLifecycleService> {
  return mockDeep<FileLifecycleService>();
}

export function createMockFileEntity(
  overrides: Partial<FileEntityInterface> = {},
): FileEntityInterface {
  return {
    id: 'file-1',
    serviceKey: STORAGE_KEY,
    fileName: 'docs/a.pdf',
    contentType: 'application/pdf',
    status: 'pending',
    dateCreated: new Date('2026-01-01'),
    dateUpdated: new Date('2026-01-01'),
    dateDeleted: null,
    version: 1,
    ...overrides,
  };
}

const fileMapper = new FileMapper();

export function toFileDomain(entity: FileEntityInterface): File {
  return fileMapper.toDomain(entity);
}

export function createMockFile(
  overrides: Partial<FileEntityInterface> = {},
): File {
  return toFileDomain(createMockFileEntity(overrides));
}
