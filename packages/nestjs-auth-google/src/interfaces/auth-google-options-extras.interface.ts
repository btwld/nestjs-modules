import { type DynamicModule } from '@nestjs/common';

export interface AuthGoogleOptionsExtrasInterface extends Pick<
  DynamicModule,
  'global'
> {}
