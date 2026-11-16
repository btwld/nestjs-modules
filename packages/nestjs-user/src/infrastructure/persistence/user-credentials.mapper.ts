import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { UserCredentials } from '../../domain/aggregates/user-credentials.js';
import { type UserCredentialEntityInterface } from '../../domain/interfaces/user-credential-entity.interface.js';

export class UserCredentialsMapper extends DomainMapper<
  UserCredentialEntityInterface,
  UserCredentials
> {
  /**
   * Picks the credential's own fields, so a relation the consumer's entity loads
   * never reaches the aggregate, or a write.
   */
  createAggregate(entity: UserCredentialEntityInterface): UserCredentials {
    const {
      id,
      version,
      dateCreated,
      dateUpdated,
      dateDeleted,
      passwordHash,
      userId,
      active,
      validFrom,
      validTo,
    } = entity;

    return new UserCredentials(
      id,
      { passwordHash, userId, active, validFrom, validTo },
      version,
      { dateCreated, dateUpdated, dateDeleted },
    );
  }

  toPersistence(credentials: UserCredentials) {
    return credentials.toPlain();
  }
}
