import { Seeder } from '@concepta/typeorm-seeding';

import { UserFactory } from './user.factory.js';

/**
 * User seeder
 */
export class UserSeeder extends Seeder {
  /**
   * Runner
   */
  public async run(): Promise<void> {
    // number of users to create
    const rawAmount = Number(process.env?.USER_MODULE_SEEDER_AMOUNT);
    const createAmount = isNaN(rawAmount) || rawAmount < 1 ? 50 : rawAmount;

    // super admin username
    const superadmin = process.env?.USER_MODULE_SEEDER_SUPERADMIN_USERNAME
      ? process.env?.USER_MODULE_SEEDER_SUPERADMIN_USERNAME
      : 'superadmin';

    // the factory
    const userFactory = this.factory(UserFactory);

    // create a super admin user
    await userFactory.create({
      username: superadmin,
    });

    // create a bunch more
    await userFactory.createMany(createAmount);
  }
}
