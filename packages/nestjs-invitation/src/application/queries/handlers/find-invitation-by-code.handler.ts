import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { Invitation } from '../../../domain/aggregates/invitation.js';
import { InvitationRepositoryInterface } from '../../../domain/repositories/invitation-repository.interface.js';
import { INVITATION_MODULE_REPOSITORY_TOKEN } from '../../../invitation.constants.js';
import { FindInvitationByCodeQuery } from '../impl/find-invitation-by-code.query.js';

@QueryHandler(FindInvitationByCodeQuery)
export class FindInvitationByCodeHandler implements IQueryHandler<FindInvitationByCodeQuery> {
  constructor(
    @Inject(INVITATION_MODULE_REPOSITORY_TOKEN)
    private readonly invitationRepo: InvitationRepositoryInterface,
  ) {}

  async execute(query: FindInvitationByCodeQuery): Promise<Invitation | null> {
    const { ctx, code } = query;

    return this.invitationRepo.findOneByCode(ctx, code);
  }
}
