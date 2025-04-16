import { Seeder } from '@concepta/typeorm-seeding';
import { CacheFactory } from './cache.factory';
import { UserFactoryFixture } from './__fixtures__/factories/user.factory.fixture';

/**
 * Cache seeder
 */
export class CacheSeeder extends Seeder {
  /**
   * Runner
   */
  public async run(): Promise<void> {
    // number of caches to create
    const createAmount = process.env?.CACHE_MODULE_SEEDER_AMOUNT
      ? Number(process.env.CACHE_MODULE_SEEDER_AMOUNT)
      : 50;

    // the factory
    const cacheFactory = this.factory(CacheFactory);
    const userFactory = this.factory(UserFactoryFixture);
    const user = await userFactory.create();

    // create a bunch
    await cacheFactory.createMany(createAmount, {
      assigneeId: user.id,
    });
  }
}
