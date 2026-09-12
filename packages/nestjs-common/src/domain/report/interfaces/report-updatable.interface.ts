import { type ReportInterface } from './report.interface';

export interface ReportUpdatableInterface
  extends
    Pick<ReportInterface, 'id' | 'status'>,
    Partial<Pick<ReportInterface, 'fileId' | 'errorMessage'>> {}
