import { type OrgProfileEntityInterface } from '@concepta/nestjs-common';
import { Factory } from '@concepta/typeorm-seeding';

import { OrgFactory } from './org.factory';

/**
 * Org profile factory
 */
export class OrgProfileFactory extends Factory<OrgProfileEntityInterface> {
  protected async finalize(
    orgProfile: OrgProfileEntityInterface,
  ): Promise<void> {
    // missing org?
    if (!orgProfile.orgId) {
      // get the org factory
      const orgFactory = this.factory(OrgFactory);

      // set the org on the profile
      const org = await orgFactory.create();
      orgProfile.orgId = org.id;
    }
  }
}
