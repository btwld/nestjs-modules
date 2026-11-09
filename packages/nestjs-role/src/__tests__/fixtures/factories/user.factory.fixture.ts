import { Factory } from '@concepta/typeorm-seeding';

import { UserEntityFixture } from '../entities/user-entity.fixture.js';

export class UserFactoryFixture extends Factory<UserEntityFixture> {
  protected options = {
    entity: UserEntityFixture,
  };
}
