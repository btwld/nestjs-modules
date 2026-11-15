import { type DynamicModule, type Provider } from '@nestjs/common';

import { type CanAccess } from '../../../domain/interfaces/can-access.interface.js';

export interface AccessControlOptionsExtrasInterface extends Pick<
  DynamicModule,
  'global' | 'imports'
> {
  queryServices?: Provider<CanAccess>[];
}
