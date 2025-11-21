import { randomUUID } from 'crypto';

import { mock, MockProxy } from 'jest-mock-extended';

import {
  FileCreatableInterface,
  RepositoryInterface,
  FileEntityInterface,
} from '@concepta/nestjs-common';

import { FileCreateDto } from '../dto/file-create.dto';
import { FileQueryException } from '../exceptions/file-query.exception';

import { FileModelService } from './file-model.service';
import { FileStrategyService } from './file-strategy.service';
import { FileService } from './file.service';

describe(FileService.name, () => {
  let fileService: FileService;
  let fileRepo: MockProxy<RepositoryInterface<FileEntityInterface>>;
  let fileStrategyService: MockProxy<FileStrategyService>;
  let fileModelService: FileModelService;

  const mockFile: FileEntityInterface = {
    id: randomUUID(),
    serviceKey: 'test-service',
    fileName: 'test.txt',
    contentType: 'application/text',
    uploadUri: 'https://upload.url',
    downloadUrl: 'https://download.url',
    dateCreated: new Date(),
    dateUpdated: new Date(),
    dateDeleted: new Date(),
    version: 1,
  };

  const mockFileCreateDto: FileCreateDto = {
    serviceKey: mockFile.serviceKey,
    fileName: mockFile.fileName,
    contentType: 'application/text',
  };

  beforeEach(() => {
    fileRepo = createMockRepository();
    fileStrategyService = createMockFileStrategyService();
    fileModelService = new FileModelService(fileRepo);

    fileService = new FileService(fileStrategyService, fileModelService);
    fileRepo.create.mockReturnValue(mockFile);
  });

  describe('push', () => {
    it('should create a new file and return upload URL', async () => {
      fileStrategyService.getUploadUrl.mockImplementationOnce(
        (_file: FileCreatableInterface) => {
          return Promise.resolve(mockFile.uploadUri || '');
        },
      );
      jest
        .spyOn(fileModelService, 'getUniqueFile')
        .mockReturnValueOnce(Promise.resolve(null))
        .mockReturnValueOnce(Promise.resolve(mockFile));
      jest
        .spyOn(fileModelService, 'create')
        .mockReturnValue(Promise.resolve(mockFile));

      const result = await fileService.push(mockFileCreateDto);

      expect(fileStrategyService.getUploadUrl).toHaveBeenCalledWith(mockFile);
      expect(result.uploadUri).toBe(mockFile.uploadUri);
    });
  });

  describe('fetch', () => {
    it('should return download URL for existing file', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile);
      fileStrategyService.getDownloadUrl.mockImplementationOnce(
        (_file: FileCreatableInterface) => {
          return Promise.resolve(mockFile.downloadUrl || '');
        },
      );

      const result = await fileService.fetch({ id: mockFile.id });

      expect(fileRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockFile.id },
      });
      expect(fileStrategyService.getDownloadUrl).toHaveBeenCalledWith(mockFile);
      expect(result.downloadUrl).toBe(mockFile.downloadUrl);
    });

    it('should throw FileQueryException if file not found', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      await expect(fileService.fetch({ id: mockFile.id })).rejects.toThrow(
        FileQueryException,
      );
      expect(fileRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockFile.id },
      });
    });
  });
});

function createMockRepository(): MockProxy<
  RepositoryInterface<FileEntityInterface>
> {
  return mock<RepositoryInterface<FileEntityInterface>>();
}

function createMockFileStrategyService(): MockProxy<FileStrategyService> {
  return mock<FileStrategyService>();
}
