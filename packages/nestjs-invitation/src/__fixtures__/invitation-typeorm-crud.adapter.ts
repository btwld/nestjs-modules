import { Injectable } from '@nestjs/common';

import {
  InjectDynamicRepository,
  InvitationEntityInterface,
} from '@concepta/nestjs-common';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';
import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { INVITATION_MODULE_INVITATION_ENTITY_KEY } from '../invitation.constants';

@Injectable()
export class InvitationTypeOrmCrudAdapter extends TypeOrmCrudAdapter<InvitationEntityInterface> {
  constructor(
    @InjectDynamicRepository(INVITATION_MODULE_INVITATION_ENTITY_KEY)
    invitationRepoAdapter: TypeOrmRepositoryAdapter<InvitationEntityInterface>,
  ) {
    super(invitationRepoAdapter);
  }
}
