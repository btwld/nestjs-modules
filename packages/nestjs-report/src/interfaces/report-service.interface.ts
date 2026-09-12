import { type ReportInterface } from '@concepta/nestjs-common';

import { type ReportCreateDto } from '../dto/report-create.dto';
import { type DoneCallback } from '../report.types';

export interface ReportServiceInterface {
  generate(report: ReportCreateDto): Promise<ReportInterface>;
  fetch(report: Pick<ReportInterface, 'id'>): Promise<ReportInterface>;
  done: DoneCallback;
}
