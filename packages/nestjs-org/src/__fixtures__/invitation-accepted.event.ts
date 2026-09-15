import { type InvitationAcceptedEventPayloadInterface } from '@concepta/nestjs-common';
import { EventAsync } from '@concepta/nestjs-event';

export class InvitationAcceptedEventAsync extends EventAsync<
  InvitationAcceptedEventPayloadInterface,
  boolean
> {}
