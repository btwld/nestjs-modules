import { type DynamicModule } from '@nestjs/common';

export interface PasswordOptionsExtrasInterface extends Pick<
  DynamicModule,
  'global'
> {}
