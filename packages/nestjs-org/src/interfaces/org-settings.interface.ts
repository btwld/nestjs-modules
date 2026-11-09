import { type InvitationAcceptedEventPayloadInterface } from '@concepta/nestjs-common';
import {
  type EventAsyncInterface,
  type EventClassInterface,
} from '@concepta/nestjs-event';

export interface OrgSettingsInterface {
  invitationRequestEvent?: EventClassInterface<
    EventAsyncInterface<InvitationAcceptedEventPayloadInterface, boolean>
  >;
}
