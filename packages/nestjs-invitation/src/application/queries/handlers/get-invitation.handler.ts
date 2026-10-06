import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { Invitation } from '../../../domain/aggregates/invitation.js';
import { InvitationRepositoryInterface } from '../../../domain/repositories/invitation-repository.interface.js';
import { INVITATION_MODULE_REPOSITORY_TOKEN } from '../../../invitation.constants.js';
import { GetInvitationQuery } from '../impl/get-invitation.query.js';

@QueryHandler(GetInvitationQuery)
export class GetInvitationHandler implements IQueryHandler<GetInvitationQuery> {
  constructor(
    @Inject(INVITATION_MODULE_REPOSITORY_TOKEN)
    private readonly invitationRepo: InvitationRepositoryInterface,
  ) {}

  async execute(query: GetInvitationQuery): Promise<Invitation | null> {
    const { ctx, id } = query;

    return this.invitationRepo.get(ctx, id);
  }
}
