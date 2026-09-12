import { type Provider } from '@nestjs/common';
import { CommandBus, EventBus } from '@nestjs/cqrs';

import { AUTHENTICATION_RECOVERY_NOTIFICATION_PORT_TOKEN } from '../../authentication.constants.js';
import { RecoveryNotificationPort } from '../../domain/ports/recovery-notification.port.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';

export function createRecoveryNotificationPortProvider(
  rawOptionsToken: symbol,
): Provider {
  return {
    provide: AUTHENTICATION_RECOVERY_NOTIFICATION_PORT_TOKEN,
    inject: [rawOptionsToken, CommandBus, EventBus],
    useFactory: (
      options: AuthenticationOptionsInterface,
      commandBus: CommandBus,
      eventBus: EventBus,
    ) =>
      options.ports?.recoveryNotification
        ? new RecoveryNotificationPort(
            options.ports.recoveryNotification,
            commandBus,
            eventBus,
          )
        : null,
  };
}
