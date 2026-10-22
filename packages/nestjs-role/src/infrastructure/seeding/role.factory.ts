import { faker } from '@faker-js/faker';

import { Factory } from '@concepta/typeorm-seeding';

import { type RoleEntityInterface } from '../../domain/interfaces/role-entity.interface.js';

/**
 * Role factory
 */
export class RoleFactory extends Factory<RoleEntityInterface> {
  /**
   * List of used names.
   */
  private usedNames: Record<string, boolean> = {};

  /**
   * Factory callback function.
   */
  protected async entity(
    role: RoleEntityInterface,
  ): Promise<RoleEntityInterface> {
    role.name = this.generateName();
    role.description = faker.lorem.sentence();
    return role;
  }

  /**
   * Generate a unique name.
   */
  protected generateName(): string {
    const MAX_ATTEMPTS = 1000;
    let name: string;
    let attempts = 0;

    do {
      name = faker.lorem.word();
      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        name = `${name}-${attempts}`;
        break;
      }
    } while (this.usedNames[name]);

    this.usedNames[name] = true;

    return name;
  }
}
