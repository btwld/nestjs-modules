import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type RoleAssignmentInterface } from '../interfaces/role-assignment.interface.js';

import { type RoleEventHeaderInterface } from './interfaces/role-event-header.interface.js';

export class RoleRevokedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost<RoleEventHeaderInterface>,
    public readonly assignment: RoleAssignmentInterface,
  ) {}
}
