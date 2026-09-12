import { Inject } from '@nestjs/common';

import { ReportInterface, ReportStatusEnum } from '@concepta/nestjs-common';
import { FileService } from '@concepta/nestjs-file';

import { ReportGeneratorResultInterface } from '../interfaces/report-generator-result.interface';
import { ReportGeneratorServiceInterface } from '../interfaces/report-generator-service.interface';

import { AWS_KEY_FIXTURE, REPORT_KEY_FIXTURE } from './constants.fixture';

export class MyReportGeneratorService implements ReportGeneratorServiceInterface {
  constructor(
    @Inject(FileService)
    private readonly fileService: FileService,
  ) {}

  KEY: string = REPORT_KEY_FIXTURE;
  generateTimeout: number = 60000;

  async getDownloadUrl(report: ReportInterface): Promise<string> {
    if (!report?.fileId) return '';
    const file = await this.fileService.fetch({ id: report.fileId });
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

    // Logic to generate file
    // PUT file

    return {
      id: report.id,
      status: ReportStatusEnum.Complete,
      file,
    } as unknown as ReportGeneratorResultInterface;
  }
}
