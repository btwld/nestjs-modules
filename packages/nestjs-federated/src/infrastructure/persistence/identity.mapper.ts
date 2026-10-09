import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { Identity } from '../../domain/aggregates/identity.js';

import { type IdentityEntityInterface } from './interfaces/identity-entity.interface.js';

export class IdentityMapper extends DomainMapper<
  IdentityEntityInterface,
  Identity
> {
  createAggregate(entity: IdentityEntityInterface): Identity {
    const { id, version, dateCreated, dateUpdated, dateDeleted, ...props } =
      entity;

    return new Identity(id, props, version, {
      dateCreated,
      dateUpdated,
      dateDeleted,
    });
  }

  toPersistence(identity: Identity) {
    return identity.toPlain();
  }
}
