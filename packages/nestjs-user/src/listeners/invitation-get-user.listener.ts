import { EventAsyncInterface, EventListenerOn } from '@concepta/nestjs-event';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  EventInstance,
  EventReturnType,
} from '@concepta/nestjs-event/dist/event-types';
import {
  InvitationGetUserEventPayloadInterface,
  InvitationGetUserEventResponseInterface,
} from '@concepta/nestjs-common';
import { QueryOptionsInterface } from '@concepta/typeorm-common';

import { USER_MODULE_SETTINGS_TOKEN } from '../user.constants';
import { UserMutateService } from '../services/user-mutate.service';
import { UserSettingsInterface } from '../interfaces/user-settings.interface';
import { UserLookupService } from '../services/user-lookup.service';

@Injectable()
export class InvitationGetUserListener
  extends EventListenerOn<
    EventAsyncInterface<
      InvitationGetUserEventPayloadInterface,
      InvitationGetUserEventResponseInterface
    >
  >
  implements OnModuleInit
{
  constructor(
    @Inject(USER_MODULE_SETTINGS_TOKEN)
    private settings: UserSettingsInterface,
    private userLookupService: UserLookupService,
    private userMutateService: UserMutateService,
  ) {
    super();
  }

  onModuleInit() {
    if (this.settings.invitationGetUserEvent) {
      this.on(this.settings.invitationGetUserEvent);
    }
  }

  async listen(
    event: EventInstance<
      EventAsyncInterface<
        InvitationGetUserEventPayloadInterface,
        InvitationGetUserEventResponseInterface
      >
    >,
  ): EventReturnType<
    EventAsyncInterface<
      InvitationGetUserEventPayloadInterface,
      InvitationGetUserEventResponseInterface
    >
  > {
    const { email, queryOptions } = event.payload;

    return this.getOrCreateUser(email, queryOptions);
  }

  async getOrCreateUser(
    email: string,
    queryOptions?: QueryOptionsInterface,
  ): Promise<InvitationGetUserEventResponseInterface> {
    let user = await this.userLookupService.byEmail(email, queryOptions);

    if (!user) {
      user = await this.userMutateService.create(
        {
          email,
          username: email,
        },
        queryOptions,
      );
    }

    return user;
  }
}
