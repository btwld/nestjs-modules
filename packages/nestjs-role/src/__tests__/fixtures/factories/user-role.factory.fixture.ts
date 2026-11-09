import { Factory } from '@concepta/typeorm-seeding';

import { UserRoleEntityFixture } from '../entities/user-role-entity.fixture.js';

export class UserRoleFactoryFixture extends Factory<UserRoleEntityFixture> {
  protected options = {
    entity: UserRoleEntityFixture,
  };
}
