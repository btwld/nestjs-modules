import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { User } from '../../domain/aggregates/user.js';
import { type UserEntityInterface } from '../../domain/interfaces/user-entity.interface.js';

export class UserMapper extends DomainMapper<UserEntityInterface, User> {
  createAggregate(entity: UserEntityInterface): User {
    const { id, version, dateCreated, dateUpdated, dateDeleted, ...props } =
      entity;
    return new User(id, props, version, {
      dateCreated,
      dateUpdated,
      dateDeleted,
    });
  }

  toPersistence(user: User) {
    return user.toPlain();
  }
}
