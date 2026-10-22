import { randomUUID } from 'crypto';

import { faker } from '@faker-js/faker';

import { Factory } from '@concepta/typeorm-seeding';

import { type CacheInterface } from '../../domain/interfaces/cache.interface.js';

/**
 * Cache factory
 */
export class CacheFactory extends Factory<CacheInterface> {
  /**
   * List of used names.
   */
  keys: string[] = ['filter', 'sort', 'list'];

  /**
   * Factory callback function.
   */
  protected async entity(cache: CacheInterface): Promise<CacheInterface> {
    const fakeFilter = {
      name: faker.person.firstName(),
      orderBy: 'name',
    };

    // set the name
    cache.key = randomUUID();
    cache.type = this.randomKey();
    cache.data = JSON.stringify(fakeFilter);
    cache.expirationDate = new Date();

    // return the new cache
    return cache;
  }

  /**
   * Get a random category.
   */
  protected randomKey(): string {
    return faker.helpers.arrayElement(this.keys);
  }
}
