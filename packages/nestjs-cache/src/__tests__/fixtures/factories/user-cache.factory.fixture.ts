import { faker } from '@faker-js/faker';

import { Factory } from '@concepta/typeorm-seeding';

import { UserCacheEntityFixture } from '../entities/user-cache-entity.fixture.js';

export class UserCacheFactoryFixture extends Factory<UserCacheEntityFixture> {
  protected options = {
    entity: UserCacheEntityFixture,
  };

  protected async entity(
    userCache: UserCacheEntityFixture,
  ): Promise<UserCacheEntityFixture> {
    userCache.key = faker.person.jobArea();
    userCache.type = 'filter';
    userCache.data = JSON.stringify({ sortBy: 'name' });
    userCache.expirationDate = new Date();

    return userCache;
  }
}
