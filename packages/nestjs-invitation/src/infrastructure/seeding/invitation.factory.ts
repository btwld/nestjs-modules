import { randomUUID } from 'crypto';

import { faker } from '@faker-js/faker';

import { Factory } from '@concepta/typeorm-seeding';

import { type InvitationEntityInterface } from '../persistence/interfaces/invitation-entity.interface.js';

export class InvitationFactory extends Factory<InvitationEntityInterface> {
  protected async entity(
    invitation: InvitationEntityInterface,
  ): Promise<InvitationEntityInterface> {
    invitation.code = randomUUID();
    invitation.category = faker.person.jobType();

    return invitation;
  }
}
