import { faker } from '@faker-js/faker';

import { type OrgEntityInterface } from '@concepta/nestjs-common';
import { Factory } from '@concepta/typeorm-seeding';

import { OrgOwnerFactory } from './org-owner.factory';

/**
 * Org factory
 */
export class OrgFactory extends Factory<OrgEntityInterface> {
  /**
   * List of used names.
   */
  usedNames: Record<string, boolean> = {};

  /**
   * Factory callback function.
   */
  protected async entity(org: OrgEntityInterface): Promise<OrgEntityInterface> {
    // set the name
    org.name = this.generateName();

    // return the new org
    return org;
  }

  protected async finalize(org: OrgEntityInterface): Promise<void> {
    if (!org.ownerId) {
      // create one owner
      const ownerFactory = this.factory(OrgOwnerFactory);
      const owner = await ownerFactory.create();
      org.ownerId = owner.id;
    }
  }

  /**
   * Generate a unique name.
   */
  protected generateName(): string {
    // the name
    let name: string;

    // keep trying to get a unique name
    do {
      name = faker.person.firstName();
    } while (this.usedNames[name]);

    // add to used names
    this.usedNames[name] = true;

    // return it
    return name;
  }
}
