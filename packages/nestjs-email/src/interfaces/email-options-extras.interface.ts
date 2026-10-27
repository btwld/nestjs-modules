import { type DynamicModule } from '@nestjs/common';

export interface EmailOptionsExtrasInterface extends Pick<
  DynamicModule,
  'global'
> {}
