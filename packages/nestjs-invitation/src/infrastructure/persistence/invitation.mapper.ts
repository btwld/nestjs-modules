import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { Invitation } from '../../domain/aggregates/invitation.js';

import { type InvitationEntityInterface } from './interfaces/invitation-entity.interface.js';

export class InvitationMapper extends DomainMapper<
  InvitationEntityInterface,
  Invitation
> {
  createAggregate(entity: InvitationEntityInterface): Invitation {
    const {
      id,
      version,
      active: _active,
      dateCreated,
      dateUpdated,
      dateDeleted,
      ...props
    } = entity;

    return new Invitation(id, props, version, {
      dateCreated,
      dateUpdated,
      dateDeleted,
    });
  }

  toPersistence(aggregate: Invitation) {
    return {
      ...aggregate.toPlain(),
      active: aggregate.active,
    };
  }
}
