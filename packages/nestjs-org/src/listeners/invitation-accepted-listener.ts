import { EventAsyncInterface, EventListenerOn } from '@concepta/nestjs-event';
import {
  INVITATION_MODULE_CATEGORY_ORG_KEY,
  InvitationAcceptedEventPayloadInterface,
} from '@concepta/nestjs-common';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';

import { ORG_MODULE_SETTINGS_TOKEN } from '../org.constants';
import { OrgSettingsInterface } from '../interfaces/org-settings.interface';
import { OrgMemberException } from '../exceptions/org-member.exception';
import { OrgMemberService } from '../services/org-member.service';

@Injectable()
export class InvitationAcceptedListener
  extends EventListenerOn<
    EventAsyncInterface<InvitationAcceptedEventPayloadInterface, boolean>
  >
  implements OnModuleInit
{
  constructor(
    @Inject(ORG_MODULE_SETTINGS_TOKEN)
    private settings: OrgSettingsInterface,
    private orgMemberService: OrgMemberService,
  ) {
    super();
  }

  onModuleInit() {
    if (this.settings.invitationRequestEvent) {
      this.on(this.settings.invitationRequestEvent);
    }
  }

  async listen(
    event: EventAsyncInterface<
      InvitationAcceptedEventPayloadInterface,
      boolean
    >,
  ) {
    // check only for invitation of type category
    if (
      event.payload.invitation.category === INVITATION_MODULE_CATEGORY_ORG_KEY
    ) {
      const userId = event.payload.invitation.user.id;
      const { orgId } = event?.payload?.invitation?.constraints ?? {};

      if (typeof userId !== 'string') {
        throw new OrgMemberException({
          message:
            'The invitation accepted event payload received has invalid content. The payload must have the "invitation.user" property.',
        });
      }

      if (typeof orgId !== 'string') {
        throw new OrgMemberException({
          message: 'The org of invitation does not have orgId in constraints',
        });
      }

      await this.orgMemberService.add(
        { userId, orgId },
        event.payload?.queryOptions,
      );

      return true;
    }

    // return true by default
    return true;
  }
}
