import { Inject } from '@nestjs/common';

import { ReportInterface, ReportStatusEnum } from '@concepta/nestjs-common';
import { FileService } from '@concepta/nestjs-file';

import { ReportGeneratorResultInterface } from '../interfaces/report-generator-result.interface';
import { ReportGeneratorServiceInterface } from '../interfaces/report-generator-service.interface';
import { delay } from '../utils/delay.util';

import {
  AWS_KEY_FIXTURE,
  REPORT_SHORT_DELAY_KEY_FIXTURE,
} from './constants.fixture';

export class MyReportGeneratorShortDelayService implements ReportGeneratorServiceInterface {
  constructor(
    @Inject(FileService)
    private readonly fileService: FileService,
  ) {}

  KEY: string = REPORT_SHORT_DELAY_KEY_FIXTURE;

  generateTimeout: number = 100;

  async getDownloadUrl(report: ReportInterface): Promise<string> {
    const file = await this.fileService.fetch({ id: report.id });
    return file.downloadUrl || '';
  }

  async generate(
    report: ReportInterface,
  ): Promise<ReportGeneratorResultInterface> {
    const file = await this.fileService.push({
      fileName: report.name,
      // TODO: should i have contenType on reports as well?
      contentType: 'application/pdf',
      serviceKey: AWS_KEY_FIXTURE,
    });

    await delay(200);
    return {
      id: report.id,
      status: ReportStatusEnum.Complete,
      file,
    } as unknown as ReportGeneratorResultInterface;
  }
}
