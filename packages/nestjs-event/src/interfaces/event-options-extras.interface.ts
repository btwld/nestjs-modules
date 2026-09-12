import { type DynamicModule } from '@nestjs/common';

export interface EventOptionsExtrasInterface extends Pick<
  DynamicModule,
  'global'
> {}
