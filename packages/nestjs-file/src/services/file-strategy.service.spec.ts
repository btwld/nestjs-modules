import { FileCreateDto } from '../dto/file-create.dto';
import { FileStorageServiceNotFoundException } from '../exceptions/file-storage-service-not-found.exception';
import { type FileStorageServiceInterface } from '../interfaces/file-storage-service.interface';

import { FileStrategyService } from './file-strategy.service';

class MockStorageService implements FileStorageServiceInterface {
  KEY = 'mock-service';

  getUploadUrl(file: FileCreateDto): string {
    return `http://upload.url/${file.serviceKey}/${file.fileName}`;
  }

  getDownloadUrl(file: FileCreateDto): string {
    return `http://download.url/${file.serviceKey}/${file.fileName}`;
  }
}

describe(FileStrategyService.name, () => {
  let fileStrategyService: FileStrategyService;
  let mockStorageService: FileStorageServiceInterface;

  beforeEach(() => {
    fileStrategyService = new FileStrategyService();
    mockStorageService = new MockStorageService();
  });

  describe(FileStrategyService.prototype.addStorageService.name, () => {
    it('should add a storage service', () => {
      fileStrategyService.addStorageService(mockStorageService);
      expect(fileStrategyService['storageServices']).toContain(
        mockStorageService,
      );
    });
  });

  describe(FileStrategyService.prototype.getUploadUrl.name, () => {
    it('should return the upload URL from the correct storage service', async () => {
      const mockFile = new FileCreateDto();
      mockFile.serviceKey = 'mock-service';
      mockFile.fileName = 'test.jpg';
      fileStrategyService.addStorageService(mockStorageService);

      const result = await fileStrategyService.getUploadUrl(mockFile);

      expect(result).toBe('http://upload.url/mock-service/test.jpg');
    });
  });

  describe(FileStrategyService.prototype.getDownloadUrl.name, () => {
    it('should return the download URL from the correct storage service', async () => {
      const mockFile = new FileCreateDto();
      mockFile.serviceKey = 'mock-service';
      mockFile.fileName = 'test.jpg';
      fileStrategyService.addStorageService(mockStorageService);

      const result = await fileStrategyService.getDownloadUrl(mockFile);

      expect(result).toBe('http://download.url/mock-service/test.jpg');
    });
  });

  describe(FileStrategyService.prototype.resolveStorageService.name, () => {
    it('should return the correct storage service for a given file', async () => {
      const mockFile = new FileCreateDto();
      mockFile.serviceKey = 'mock-service';
      fileStrategyService.addStorageService(mockStorageService);

      const result = await fileStrategyService.resolveStorageService(mockFile);

      expect(result).toBe(mockStorageService);
    });

    it('should throw FileStorageServiceNotFoundException if no matching service is found', () => {
      const mockFile = new FileCreateDto();
      mockFile.serviceKey = 'non-existent-service';

      expect(() => fileStrategyService.resolveStorageService(mockFile)).toThrow(
        FileStorageServiceNotFoundException,
      );
    });
  });
});
