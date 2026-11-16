import { type DynamicModule, type Type } from '@nestjs/common';

import { type InvitationRepositoryInterface } from '../../domain/repositories/invitation-repository.interface.js';

export interface InvitationOptionsExtrasInterface extends Pick<
  DynamicModule,
  'global'
> {
  entities?: {
    invitation?: string;
  };
  repositories?: {
    invitation?: Type<InvitationRepositoryInterface>;
  };
}
