import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { Factory } from '@concepta/typeorm-seeding';
import { InvitationEntityInterface } from '../interfaces/domain/invitation-entity.interface';

export class InvitationFactory extends Factory<InvitationEntityInterface> {
  protected async entity(
    invitation: InvitationEntityInterface,
  ): Promise<InvitationEntityInterface> {
    invitation.code = randomUUID();
    invitation.category = faker.person.jobType();

    return invitation;
  }
}
