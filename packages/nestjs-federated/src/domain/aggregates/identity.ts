import { randomUUID } from 'crypto';

import {
  type DomainFactory,
  type EventContextHost,
  type ReferenceIdInterface,
} from '@concepta/nestjs-core';
import {
  type AggregateMetaInterface,
  DomainAggregate,
} from '@concepta/nestjs-core/aggregate';

import { IdentityCreatedEvent } from '../events/identity-created.event.js';
import { type IdentityCreatableInterface } from '../interfaces/identity-creatable.interface.js';
import { type IdentityInterface } from '../interfaces/identity.interface.js';

export class Identity extends DomainAggregate<IdentityInterface> {
  constructor(
    id: string,
    props: IdentityInterface,
    version?: number,
    meta?: AggregateMetaInterface,
  ) {
    super(id, props, version, meta);
  }

  get provider() {
    return this.props.provider;
  }
  get subject() {
    return this.props.subject;
  }
  get user(): ReferenceIdInterface {
    return this.props.user;
  }

  static create(
    eventContext: EventContextHost,
    dto: IdentityCreatableInterface,
  ): Identity {
    return Identity.createWithId(eventContext, randomUUID(), dto);
  }

  static createWithId(
    eventContext: EventContextHost,
    id: string,
    dto: IdentityCreatableInterface,
  ): Identity {
    const { provider, subject, user } = dto;

    const identity = new Identity(id, { provider, subject, user });

    identity.apply(new IdentityCreatedEvent(eventContext, identity.toPlain()));

    return identity;
  }
}

Identity satisfies DomainFactory<IdentityCreatableInterface, Identity>;
