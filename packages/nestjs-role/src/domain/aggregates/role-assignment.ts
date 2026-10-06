import { randomUUID } from 'crypto';

import {
  type DomainFactory,
  type EventContextHost,
} from '@concepta/nestjs-core';
import { DomainAggregate } from '@concepta/nestjs-core/aggregate';

import { type RoleEventHeaderInterface } from '../events/interfaces/role-event-header.interface.js';
import { RoleAssignedEvent } from '../events/role-assigned.event.js';
import { RoleRevokedEvent } from '../events/role-revoked.event.js';
import { type RoleAssignmentInterface } from '../interfaces/role-assignment.interface.js';

export interface RoleAssignmentCreateProps {
  roleId: string;
  assigneeId: string;
}

export class RoleAssignment extends DomainAggregate<RoleAssignmentInterface> {
  get roleId() {
    return this.props.roleId;
  }

  get assigneeId() {
    return this.props.assigneeId;
  }

  static create(
    eventContext: EventContextHost<RoleEventHeaderInterface>,
    props: RoleAssignmentCreateProps,
  ): RoleAssignment {
    return RoleAssignment.createWithId(eventContext, randomUUID(), props);
  }

  static createWithId(
    eventContext: EventContextHost<RoleEventHeaderInterface>,
    id: string,
    props: RoleAssignmentCreateProps,
  ): RoleAssignment {
    const { roleId, assigneeId } = props;

    const instance = new RoleAssignment(id, {
      roleId,
      assigneeId,
    });

    instance.apply(new RoleAssignedEvent(eventContext, instance.toPlain()));

    return instance;
  }

  revoke(eventContext: EventContextHost<RoleEventHeaderInterface>): void {
    this.apply(new RoleRevokedEvent(eventContext, this.toPlain()));
  }
}

RoleAssignment satisfies DomainFactory<
  RoleAssignmentCreateProps,
  RoleAssignment
>;
