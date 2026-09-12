import { type Provider } from '@nestjs/common';
import { CommandBus, EventBus } from '@nestjs/cqrs';

import { AUTHENTICATION_VERIFY_NOTIFICATION_PORT_TOKEN } from '../../authentication.constants.js';
import { VerifyNotificationPort } from '../../domain/ports/verify-notification.port.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';

export function createVerifyNotificationPortProvider(
  rawOptionsToken: symbol,
): Provider {
  return {
    provide: AUTHENTICATION_VERIFY_NOTIFICATION_PORT_TOKEN,
    inject: [rawOptionsToken, CommandBus, EventBus],
    useFactory: (
      options: AuthenticationOptionsInterface,
      commandBus: CommandBus,
      eventBus: EventBus,
    ) =>
      options.ports?.verifyNotification
        ? new VerifyNotificationPort(
            options.ports.verifyNotification,
            commandBus,
            eventBus,
          )
        : null,
  };
}
