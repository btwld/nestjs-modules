import { randomUUID } from 'crypto';

import {
  type DomainFactory,
  type EventContextHost,
} from '@concepta/nestjs-core';
import { DomainAggregate } from '@concepta/nestjs-core/aggregate';

import { type RoleEventHeaderInterface } from '../events/interfaces/role-event-header.interface.js';
import { RoleCreatedEvent } from '../events/role-created.event.js';
import { RoleReplacedEvent } from '../events/role-replaced.event.js';
import { RoleUpdatedEvent } from '../events/role-updated.event.js';
import { type RoleInterface } from '../interfaces/role.interface.js';

export interface RoleCreateProps {
  name: string;
  description: string;
}

export class Role extends DomainAggregate<RoleInterface> {
  get name() {
    return this.props.name;
  }

  get description() {
    return this.props.description;
  }

  static create(
    eventContext: EventContextHost<RoleEventHeaderInterface>,
    props: RoleCreateProps,
  ): Role {
    return Role.createWithId(eventContext, randomUUID(), props);
  }

  static createWithId(
    eventContext: EventContextHost<RoleEventHeaderInterface>,
    id: string,
    props: RoleCreateProps,
  ): Role {
    const { name, description } = props;

    const role = new Role(id, {
      name,
      description,
    });

    role.apply(new RoleCreatedEvent(eventContext, role.toPlain()));

    return role;
  }

  update(
    eventContext: EventContextHost<RoleEventHeaderInterface>,
    dto: Partial<RoleCreateProps>,
  ): void {
    this.props = {
      ...this.props,
      ...dto,
    };
    this.incrementVersion();
    this.apply(new RoleUpdatedEvent(eventContext, this.toPlain()));
  }

  replace(
    eventContext: EventContextHost<RoleEventHeaderInterface>,
    dto: RoleCreateProps,
  ): void {
    this.props = {
      name: dto.name,
      description: dto.description,
    };
    this.incrementVersion();
    this.apply(new RoleReplacedEvent(eventContext, this.toPlain()));
  }
}

Role satisfies DomainFactory<RoleCreateProps, Role>;
