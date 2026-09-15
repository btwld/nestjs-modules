import { type ReportGeneratorResultInterface } from './interfaces/report-generator-result.interface';

export type DoneCallback = (
  report: ReportGeneratorResultInterface,
) => Promise<void>;
