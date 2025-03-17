import { EventAsync } from '@concepta/nestjs-event';
import { InvitationAcceptedEventPayloadInterface } from '@concepta/nestjs-common';

export class InvitationAcceptedEventAsync extends EventAsync<
  InvitationAcceptedEventPayloadInterface,
  boolean
> {}
