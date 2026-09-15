import { type DynamicModule, type Provider } from '@nestjs/common';

import { type CanAccess } from '../../../domain/policies/can-access.policy.js';

export interface AccessControlOptionsExtrasInterface extends Pick<
  DynamicModule,
  'global' | 'imports'
> {
  queryServices?: Provider<CanAccess>[];
}
