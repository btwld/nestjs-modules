import { type Provider, type Type } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type InvitationRepositoryInterface } from '../../domain/repositories/invitation-repository.interface.js';
import { INVITATION_MODULE_REPOSITORY_TOKEN } from '../../invitation.constants.js';
import { type InvitationEntityInterface } from '../persistence/interfaces/invitation-entity.interface.js';
import { InvitationMapper } from '../persistence/invitation.mapper.js';
import { InvitationRepository } from '../persistence/invitation.repository.js';

export function createInvitationRepositoryProvider(
  entityKey: string,
  customRepository?: Type<InvitationRepositoryInterface>,
): Provider[] {
  if (customRepository) {
    return [
      {
        provide: INVITATION_MODULE_REPOSITORY_TOKEN,
        useClass: customRepository,
      },
    ];
  }

  return [
    {
      provide: INVITATION_MODULE_REPOSITORY_TOKEN,
      inject: [getDynamicRepositoryToken(entityKey), InvitationMapper],
      useFactory: (
        repository: RepositoryInterface<InvitationEntityInterface>,
        mapper: InvitationMapper,
      ) => new InvitationRepository(repository, mapper),
    },
  ];
}
