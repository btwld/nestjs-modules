import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import {
  NoopSendInvitationNotificationCommand,
  NoopSendAcceptedNotificationCommand,
} from './noop-notification.command.js';

@CommandHandler(NoopSendInvitationNotificationCommand)
export class NoopSendInvitationNotificationHandler implements ICommandHandler<NoopSendInvitationNotificationCommand> {
  async execute(): Promise<void> {
    // noop — notification not actually sent in tests
  }
}

@CommandHandler(NoopSendAcceptedNotificationCommand)
export class NoopSendAcceptedNotificationHandler implements ICommandHandler<NoopSendAcceptedNotificationCommand> {
  async execute(): Promise<void> {
    // noop — notification not actually sent in tests
  }
}
