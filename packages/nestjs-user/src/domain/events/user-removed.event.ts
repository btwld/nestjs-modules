import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type UserInterface } from '../interfaces/user.interface.js';

export class UserRemovedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost,
    public readonly user: UserInterface,
  ) {}
}
