import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { User } from '../../domain/aggregates/user.js';
import { type UserEntityInterface } from '../../domain/interfaces/user-entity.interface.js';

export class UserMapper extends DomainMapper<UserEntityInterface, User> {
  /**
   * Picks the user's own fields, so a relation the consumer's entity loads
   * never reaches the aggregate, or a write.
   */
  createAggregate(entity: UserEntityInterface): User {
    const {
      id,
      version,
      dateCreated,
      dateUpdated,
      dateDeleted,
      email,
      username,
      active,
    } = entity;

    return new User(id, { email, username, active }, version, {
      dateCreated,
      dateUpdated,
      dateDeleted,
    });
  }

  toPersistence(user: User) {
    return user.toPlain();
  }
}
