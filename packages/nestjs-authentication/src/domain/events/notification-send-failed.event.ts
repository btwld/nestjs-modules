import { type PlainLiteralObject, type Type } from '@nestjs/common';
import { type Command, type IEvent } from '@nestjs/cqrs';

import { type ReferenceEmail } from '@concepta/nestjs-core';

import { type AuthenticationEmailException } from '../exceptions/authentication-email.exception.js';

export class NotificationSendFailedEvent implements IEvent {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: ReferenceEmail,
    public readonly command: Type<Command<void>>,
    // A classified RuntimeException (fault: 'internal'), not a bare
    // `unknown` — a subscriber can read `.message`/`.context.originalError`
    // without an `instanceof Error` guess first.
    public readonly error: AuthenticationEmailException,
  ) {}
}
