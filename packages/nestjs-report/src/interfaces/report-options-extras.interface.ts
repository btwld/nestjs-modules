import { type DynamicModule } from '@nestjs/common';

export interface ReportOptionsExtrasInterface extends Pick<
  DynamicModule,
  'global'
> {}
