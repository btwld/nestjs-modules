import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { UserCredentials } from '../../domain/aggregates/user-credentials.js';
import { type UserCredentialEntityInterface } from '../../domain/interfaces/user-credential-entity.interface.js';
import { type UserCredentialInterface } from '../../domain/interfaces/user-credential.interface.js';

export class UserCredentialsMapper extends DomainMapper<
  UserCredentialEntityInterface,
  UserCredentialInterface,
  UserCredentials
> {
  createAggregate(entity: UserCredentialEntityInterface): UserCredentials {
    const { id, version, dateCreated, dateUpdated, dateDeleted, ...props } =
      entity;
    return new UserCredentials(id, props, version, {
      dateCreated,
      dateUpdated,
      dateDeleted,
    });
  }
}
