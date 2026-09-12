import { type ReportCreatableInterface } from '@concepta/nestjs-common';

import { type ReportGeneratorResultInterface } from './report-generator-result.interface';

export interface ReportGeneratorServiceInterface {
  KEY: string;
  generateTimeout: number;
  generate(
    report: ReportCreatableInterface,
  ): Promise<ReportGeneratorResultInterface>;
  getDownloadUrl(report: ReportCreatableInterface): Promise<string>;
}
