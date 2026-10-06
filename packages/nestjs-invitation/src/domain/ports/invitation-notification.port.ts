import { Injectable, PlainLiteralObject, Type } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { InvitationEventPayloadInterface } from '../events/interfaces/invitation-event-payload.interface.js';

export interface SendInvitationNotificationCommandInterface {
  ctx: PlainLiteralObject;
  invitation: InvitationEventPayloadInterface;
  passcode: string;
  tokenExp: Date;
}

export interface SendAcceptedNotificationCommandInterface {
  ctx: PlainLiteralObject;
  invitation: InvitationEventPayloadInterface;
}

export interface InvitationNotificationPortSettings {
  sendInvitationCommand: Type<SendInvitationNotificationCommandInterface>;
  sendAcceptedCommand: Type<SendAcceptedNotificationCommandInterface>;
}

@Injectable()
export class InvitationNotificationPort {
  constructor(
    private readonly portSettings: InvitationNotificationPortSettings,
    private readonly commandBus: CommandBus,
  ) {}

  async sendInvitation(
    ctx: PlainLiteralObject,
    invitation: InvitationEventPayloadInterface,
    params: {
      passcode: string;
      tokenExp: Date;
    },
  ): Promise<void> {
    return this.commandBus.execute(
      new this.portSettings.sendInvitationCommand({
        ctx,
        invitation,
        ...params,
      }),
    );
  }

  async sendAccepted(
    ctx: PlainLiteralObject,
    invitation: InvitationEventPayloadInterface,
  ): Promise<void> {
    return this.commandBus.execute(
      new this.portSettings.sendAcceptedCommand({ ctx, invitation }),
    );
  }
}
