import { type ReportCreatableInterface } from '@concepta/nestjs-common';

import { type ReportGeneratorResultInterface } from './report-generator-result.interface';

export interface ReportStrategyServiceInterface {
  generate(
    report: ReportCreatableInterface,
  ): Promise<ReportGeneratorResultInterface>;
  getDownloadUrl(report: ReportCreatableInterface): Promise<string>;
}
