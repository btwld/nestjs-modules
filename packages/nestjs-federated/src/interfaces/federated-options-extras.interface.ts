import { type DynamicModule, type Type } from '@nestjs/common';

import { type IdentityRepositoryInterface } from '../domain/repositories/identity-repository.interface.js';

export interface FederatedOptionsExtrasInterface extends Pick<
  DynamicModule,
  'global'
> {
  entities?: {
    identity?: string;
  };
  repositories?: {
    identity?: Type<IdentityRepositoryInterface>;
  };
}
