import { type DynamicModule } from '@nestjs/common';

export interface CoralogixOptionsExtrasInterface extends Pick<
  DynamicModule,
  'global'
> {}
