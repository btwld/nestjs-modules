import { type ReportInterface } from '@concepta/nestjs-common';

export interface ReportStatusInterface extends Pick<
  ReportInterface,
  'status'
> {}
