import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { Invitation } from '../../domain/aggregates/invitation.js';

import { type InvitationEntityInterface } from './interfaces/invitation-entity.interface.js';

export class InvitationMapper extends DomainMapper<
  InvitationEntityInterface,
  Invitation
> {
  /**
   * Picks the invitation's own fields, so a relation the consumer's entity loads
   * never reaches the aggregate, or a write.
   */
  createAggregate(entity: InvitationEntityInterface): Invitation {
    const {
      id,
      version,
      dateCreated,
      dateUpdated,
      dateDeleted,
      userId,
      code,
      category,
      constraints,
      dateAccepted,
      dateRevoked,
    } = entity;

    return new Invitation(
      id,
      { userId, code, category, constraints, dateAccepted, dateRevoked },
      version,
      { dateCreated, dateUpdated, dateDeleted },
    );
  }

  toPersistence(aggregate: Invitation) {
    return {
      ...aggregate.toPlain(),
      active: aggregate.active,
    };
  }
}
