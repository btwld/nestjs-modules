import { randomUUID } from 'crypto';

import { mock, MockProxy } from 'jest-mock-extended';

import {
  ReportCreatableInterface,
  ReportStatusEnum,
  ReportEntityInterface,
  RepositoryInterface,
} from '@concepta/nestjs-common';

import { ReportCreateDto } from '../dto/report-create.dto';
import { ReportDuplicateEntryException } from '../exceptions/report-duplicated.exception';
import { ReportQueryException } from '../exceptions/report-query.exception';
import { ReportModelServiceInterface } from '../interfaces/report-model-service.interface';

import { ReportModelService } from './report-model.service';
import { ReportStrategyService } from './report-strategy.service';
import { ReportService } from './report.service';

const mockReport: ReportEntityInterface = {
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

const mockReportCreateDto: ReportCreateDto = {
  serviceKey: mockReport.serviceKey,
  name: mockReport.name,
  status: ReportStatusEnum.Processing,
};

describe(ReportService.name, () => {
  let reportService: ReportService;
  let reportRepo: MockProxy<RepositoryInterface<ReportEntityInterface>>;
  let reportStrategyService: MockProxy<ReportStrategyService>;
  let reportModelService: ReportModelServiceInterface;

  beforeEach(() => {
    reportRepo = createMockRepository();
    reportStrategyService = createMockReportStrategyService();
    reportModelService = new ReportModelService(reportRepo);

    reportService = new ReportService(
      reportStrategyService,
      reportModelService,
    );
    reportRepo.create.mockReturnValue(mockReport);
  });

  describe('generate', () => {
    it('should create a new report', async () => {
      reportStrategyService.generate.mockImplementationOnce(
        (_report: ReportCreatableInterface) => {
          return Promise.resolve(mockReport);
        },
      );
      jest
        .spyOn(reportRepo, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockReport);
      jest.spyOn(reportService, 'done');

      const result = await reportService.generate(mockReportCreateDto);
      expect(reportStrategyService.generate).toHaveBeenCalledWith(mockReport);
      expect(reportService.done).toHaveBeenCalledWith(mockReport);
      expect(result.id).toBe(mockReport.id);
    });
    it('should report be with error', async () => {
      reportStrategyService.generate.mockImplementationOnce(
        (_report: ReportCreatableInterface) => {
          throw new Error('Error generating report');
        },
      );
      jest
        .spyOn(reportRepo, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockReport);
      const doneSpy = jest.spyOn(reportService, 'done');

      const result = await reportService.generate(mockReportCreateDto);
      expect(reportStrategyService.generate).toHaveBeenCalledWith(mockReport);
      expect(doneSpy).toHaveBeenCalledWith({
        id: mockReport.id,
        status: ReportStatusEnum.Error,
        errorMessage: 'Error generating report',
      });
      expect(result.id).toBe(mockReport.id);
    });
    it('should throw excetion', async () => {
      reportStrategyService.generate.mockImplementationOnce(
        (_report: ReportCreatableInterface) => {
          return Promise.resolve(mockReport);
        },
      );
      jest.spyOn(reportRepo, 'findOne').mockResolvedValueOnce(mockReport);
      jest.spyOn(reportService, 'done');

      await expect(reportService.generate(mockReportCreateDto)).rejects.toThrow(
        ReportDuplicateEntryException,
      );
    });
  });

  describe('fetch', () => {
    it('should return report', async () => {
      reportRepo.findOne.mockResolvedValue(mockReport);
      reportStrategyService.getDownloadUrl.mockImplementationOnce(
        (_report: ReportCreatableInterface) => {
          return Promise.resolve(mockReport.downloadUrl || '');
        },
      );
      jest.spyOn(reportRepo, 'findOne').mockResolvedValueOnce(mockReport);

      const result = await reportService.fetch({ id: mockReport.id });

      expect(reportRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockReport.id },
      });
      expect(result.downloadUrl).toBe(mockReport.downloadUrl);
    });

    it('should return download URL for existing report', async () => {
      const reportWithFile = {
        ...mockReport,
        fileId: randomUUID(),
      };
      reportRepo.findOne.mockResolvedValue(reportWithFile);
      reportStrategyService.getDownloadUrl.mockImplementationOnce(
        (_report: ReportCreatableInterface) => {
          return Promise.resolve(reportWithFile.downloadUrl || '');
        },
      );
      jest.spyOn(reportRepo, 'findOne').mockResolvedValueOnce(reportWithFile);

      const result = await reportService.fetch({ id: mockReport.id });

      expect(reportRepo.findOne).toHaveBeenCalledWith({
        where: { id: reportWithFile.id },
      });
      expect(reportStrategyService.getDownloadUrl).toHaveBeenCalledWith(
        reportWithFile,
      );
      expect(result.downloadUrl).toBe(reportWithFile.downloadUrl);
    });

    it('should throw ReportQueryException if report not found', async () => {
      reportRepo.findOne.mockResolvedValue(null);

      await expect(reportService.fetch({ id: mockReport.id })).rejects.toThrow(
        ReportQueryException,
      );
      expect(reportRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockReport.id },
      });
    });
  });
});

function createMockRepository(): MockProxy<
  RepositoryInterface<ReportEntityInterface>
> {
  return mock<RepositoryInterface<ReportEntityInterface>>({
    findOne: jest.fn().mockResolvedValue(mockReport),
    create: jest.fn().mockReturnValue(mockReport),
    save: jest.fn().mockResolvedValue(mockReport),
  });
}

function createMockReportStrategyService(): MockProxy<ReportStrategyService> {
  return mock<ReportStrategyService>({
    generate: jest.fn().mockResolvedValue(mockReport),
  });
}
