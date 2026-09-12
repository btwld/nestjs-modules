import {
  type ReportUpdatableInterface,
  type ReferenceIdInterface,
} from '@concepta/nestjs-common';

export interface ReportGeneratorResultInterface
  extends ReportUpdatableInterface, ReferenceIdInterface {}
