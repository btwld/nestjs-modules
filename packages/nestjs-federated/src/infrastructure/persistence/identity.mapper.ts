import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { Identity } from '../../domain/aggregates/identity.js';

import { type IdentityEntityInterface } from './interfaces/identity-entity.interface.js';

export class IdentityMapper extends DomainMapper<
  IdentityEntityInterface,
  Identity
> {
  /**
   * Picks the identity's own fields, so a relation the consumer's entity loads
   * alongside `userId` never reaches the aggregate, or a write.
   */
  createAggregate(entity: IdentityEntityInterface): Identity {
    const {
      id,
      version,
      dateCreated,
      dateUpdated,
      dateDeleted,
      provider,
      subject,
      userId,
    } = entity;

    return new Identity(id, { provider, subject, userId }, version, {
      dateCreated,
      dateUpdated,
      dateDeleted,
    });
  }

  toPersistence(identity: Identity) {
    return identity.toPlain();
  }
}
