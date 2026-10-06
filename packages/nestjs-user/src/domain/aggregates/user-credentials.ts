import { randomUUID } from 'crypto';

import {
  type DomainFactory,
  type EventContextHost,
} from '@concepta/nestjs-core';
import { DomainAggregate } from '@concepta/nestjs-core/aggregate';

import { UserCredentialsCreatedEvent } from '../events/user-credentials-created.event.js';
import { UserCredentialsDeactivatedEvent } from '../events/user-credentials-deactivated.event.js';
import { type UserCredentialCreatableInterface } from '../interfaces/user-credential-creatable.interface.js';
import { type UserCredentialInterface } from '../interfaces/user-credential.interface.js';

export class UserCredentials extends DomainAggregate<UserCredentialInterface> {
  get userId() {
    return this.props.userId;
  }

  get passwordHash() {
    return this.props.passwordHash;
  }

  get active() {
    return this.props.active;
  }

  get validFrom() {
    return this.props.validFrom;
  }

  get validTo() {
    return this.props.validTo;
  }

  private toEventPayload() {
    const { passwordHash: _ph, ...payload } = this.props;
    return payload;
  }

  static create(
    eventContext: EventContextHost,
    props: UserCredentialCreatableInterface,
  ): UserCredentials {
    return UserCredentials.createWithId(eventContext, randomUUID(), props);
  }

  static createWithId(
    eventContext: EventContextHost,
    id: string,
    props: UserCredentialCreatableInterface,
  ): UserCredentials {
    const now = new Date();

    const credentials = new UserCredentials(id, {
      userId: props.userId,
      passwordHash: props.passwordHash,
      active: true,
      validFrom: now,
      validTo: null,
    });

    credentials.apply(
      new UserCredentialsCreatedEvent(
        eventContext,
        credentials.toEventPayload(),
      ),
    );

    return credentials;
  }

  deactivate(eventContext: EventContextHost): void {
    const now = new Date();

    this.props = {
      ...this.props,
      active: false,
      validTo: now,
    };

    this.incrementVersion();

    this.apply(
      new UserCredentialsDeactivatedEvent(eventContext, this.toEventPayload()),
    );
  }
}

UserCredentials satisfies DomainFactory<
  UserCredentialCreatableInterface,
  UserCredentials
>;
