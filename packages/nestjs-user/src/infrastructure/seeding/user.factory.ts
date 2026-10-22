import { faker } from '@faker-js/faker';

import { Factory } from '@concepta/typeorm-seeding';

import { type UserEntityInterface } from '../../domain/interfaces/user-entity.interface.js';

/**
 * User factory
 */
export class UserFactory extends Factory<UserEntityInterface> {
  /**
   * List of used usernames.
   */
  private usedUsernames = new Set<string>();

  /**
   * Factory callback function.
   */
  protected async entity(
    user: UserEntityInterface,
  ): Promise<UserEntityInterface> {
    // TypeORM requires entity class instances (not plain objects)
    user.username = this.generateUniqueUsername();
    user.email = faker.internet.email();

    return user;
  }

  /**
   * Generate a unique username.
   */
  protected generateUniqueUsername(): string {
    const maxAttempts = 1000;
    let username: string;
    let attempts = 0;

    do {
      if (attempts++ >= maxAttempts) {
        throw new Error('Unable to generate unique username');
      }
      username = faker.internet.userName().toLowerCase();
    } while (this.usedUsernames.has(username));

    this.usedUsernames.add(username);

    return username;
  }
}
