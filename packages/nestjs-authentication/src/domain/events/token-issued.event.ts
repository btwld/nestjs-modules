import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type TokenInterface } from '../interfaces/token.interface.js';

export class TokenIssuedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost,
    public readonly token: TokenInterface & { id: string },
    public readonly refreshedFrom?: string,
  ) {}
}
