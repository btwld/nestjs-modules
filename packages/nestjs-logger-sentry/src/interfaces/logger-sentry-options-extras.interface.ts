import { type DynamicModule } from '@nestjs/common';

export interface LoggerSentryOptionsExtrasInterface extends Pick<
  DynamicModule,
  'global'
> {}
