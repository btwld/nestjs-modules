import { randomUUID } from 'crypto';

import { mock } from 'jest-mock-extended';

import {
  ReportCreatableInterface,
  ReportInterface,
  ReportStatusEnum,
} from '@concepta/nestjs-common';

import { ReportCreateDto } from '../dto/report-create.dto';
import { ReportGeneratorServiceInterface } from '../interfaces/report-generator-service.interface';

import { ReportStrategyService } from './report-strategy.service';

class MockStorageService implements ReportGeneratorServiceInterface {
  KEY = 'mock-service';

  generateTimeout = 3600;

  uploadTimeout = 3600;

  generate(_report: ReportCreatableInterface): Promise<ReportInterface> {
    const mockReport: ReportInterface = {
      id: randomUUID(),
      serviceKey: 'test-service',
      name: 'test.txt',
      status: ReportStatusEnum.Complete,
      errorMessage: null,
      downloadUrl: 'https://download.url',
      dateCreated: new Date(),
      dateUpdated: new Date(),
      dateDeleted: new Date(),
      version: 1,
      fileId: randomUUID(),
    };
    return Promise.resolve(mockReport);
  }

  getUploadUrl(report: ReportCreateDto): string {
    return `http://upload.url/${report.serviceKey}/${report.name}`;
  }

  getDownloadUrl(report: ReportCreateDto): Promise<string> {
    return Promise.resolve(
      `http://download.url/${report.serviceKey}/${report.name}`,
    );
  }
}

describe(ReportStrategyService.name, () => {
  let reportStrategyService: ReportStrategyService;
  let mockStorageService: ReportGeneratorServiceInterface;

  beforeEach(() => {
    reportStrategyService = new ReportStrategyService({
      generateTimeout: 3600 * 1000,
    });
    mockStorageService = new MockStorageService();
  });

  describe(ReportStrategyService.prototype.addStorageService.name, () => {
    it('should add a storage service', () => {
      reportStrategyService.addStorageService(mockStorageService);
      expect(reportStrategyService['reportGeneratorServices']).toContain(
        mockStorageService,
      );
    });
  });

  describe(ReportStrategyService.prototype.generate.name, () => {
    it('should return the upload URL from the correct storage service', async () => {
      const mockReport: ReportInterface = mock<ReportInterface>({
        serviceKey: 'mock-service',
        name: 'test.jpg',
      });
      mockReport.serviceKey = 'mock-service';
      mockReport.name = 'test.jpg';
      reportStrategyService.addStorageService(mockStorageService);

      jest.spyOn(mockStorageService, 'generate');

      const result = await reportStrategyService.generate(mockReport);

      expect(mockStorageService.generate).toHaveBeenCalledWith(mockReport);
      expect(result.status).toBe(ReportStatusEnum.Complete);
    });
  });

  describe(ReportStrategyService.prototype.getDownloadUrl.name, () => {
    it('should return the download URL from the correct storage service', async () => {
      const mockReport = new ReportCreateDto();
      mockReport.serviceKey = 'mock-service';
      mockReport.name = 'test.jpg';
      reportStrategyService.addStorageService(mockStorageService);

      const result = await reportStrategyService.getDownloadUrl(mockReport);

      expect(result).toBe('http://download.url/mock-service/test.jpg');
    });
  });

  describe(
    ReportStrategyService.prototype['resolveGeneratorService'].name,
    () => {
      it('should return the correct storage service for a given report', async () => {
        const mockReport = new ReportCreateDto();
        mockReport.serviceKey = 'mock-service';
        reportStrategyService.addStorageService(mockStorageService);

        const result =
          await reportStrategyService['resolveGeneratorService'](mockReport);

        expect(result).toBe(mockStorageService);
      });
    },
  );
});
