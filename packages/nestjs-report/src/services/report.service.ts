import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import {
  ReportCreatableInterface,
  ReportInterface,
  ReportStatusEnum,
  ReportEntityInterface,
  mapNonErrorToException,
} from '@concepta/nestjs-common';

import { ReportCreateException } from '../exceptions/report-create.exception';
import { ReportDuplicateEntryException } from '../exceptions/report-duplicated.exception';
import { ReportIdMissingException } from '../exceptions/report-id-missing.exception';
import { ReportQueryException } from '../exceptions/report-query.exception';
import { ReportGeneratorResultInterface } from '../interfaces/report-generator-result.interface';
import { ReportModelServiceInterface } from '../interfaces/report-model-service.interface';
import { ReportServiceInterface } from '../interfaces/report-service.interface';
import { REPORT_STRATEGY_SERVICE_KEY } from '../report.constants';

import { ReportModelService } from './report-model.service';
import { ReportStrategyService } from './report-strategy.service';

/**
 * Service responsible for managing report operations.
 */
@Injectable()
export class ReportService implements ReportServiceInterface {
  constructor(
    @Inject(REPORT_STRATEGY_SERVICE_KEY)
    private reportStrategyService: ReportStrategyService,
    @Inject(ReportModelService)
    private reportModelService: ReportModelServiceInterface,
  ) {}

  async generate(report: ReportCreatableInterface): Promise<ReportInterface> {
    await this.checkExistingReport(report);
    try {
      const reportDb = await this.createAndSaveReport(report);

      // trigger report generation
      this.generateAndProcessReport(reportDb);

      return reportDb;
    } catch (originalError) {
      throw new ReportCreateException({ originalError });
    }
  }

  async fetch(report: Pick<ReportInterface, 'id'>): Promise<ReportInterface> {
    if (!report.id) {
      throw new ReportIdMissingException();
    }

    const dbReport = await this.reportModelService.getWithFile(report);

    if (!dbReport) {
      throw new ReportQueryException({
        message: 'Report with id %s not found',
        messageParams: [report.id],
        httpStatus: HttpStatus.NOT_FOUND,
      });
    }

    return this.addDownloadUrl(dbReport);
  }

  async done(report: ReportGeneratorResultInterface): Promise<void> {
    if (!report.id) {
      throw new ReportIdMissingException();
    }

    this.reportModelService.update(report);
  }

  protected async generateAndProcessReport(
    reportDb: ReportInterface,
  ): Promise<void> {
    try {
      const result = await this.reportStrategyService.generate(reportDb);
      await this.done(result);
    } catch (err) {
      const finalError = mapNonErrorToException(err);
      await this.done({
        id: reportDb.id,
        status: ReportStatusEnum.Error,
        errorMessage: finalError.message,
      });
    }
  }

  protected async createAndSaveReport(
    report: ReportCreatableInterface,
  ): Promise<ReportEntityInterface> {
    return await this.reportModelService.create(report);
  }

  protected async checkExistingReport(
    report: ReportCreatableInterface,
  ): Promise<void> {
    const existingReport =
      await this.reportModelService.getUniqueReport(report);

    if (existingReport) {
      throw new ReportDuplicateEntryException(report.serviceKey, report.name);
    }
  }

  protected async addDownloadUrl(
    report: ReportInterface,
  ): Promise<ReportEntityInterface> {
    if (report.fileId) {
      try {
        report.downloadUrl =
          await this.reportStrategyService.getDownloadUrl(report);
      } catch (_err) {
        report.downloadUrl = '';
      }
    }
    return report;
  }
}
