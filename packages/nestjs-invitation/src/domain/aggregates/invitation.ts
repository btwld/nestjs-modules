import { randomUUID } from 'crypto';

import { type PlainLiteralObject } from '@nestjs/common';

import {
  type DomainFactory,
  type EventContextHost,
} from '@concepta/nestjs-core';
import {
  type AggregateMetaInterface,
  DomainAggregate,
} from '@concepta/nestjs-core/aggregate';

import { type InvitationDispatchedMetadataInterface } from '../events/interfaces/invitation-dispatched-metadata.interface.js';
import { type InvitationEventHeaderInterface } from '../events/interfaces/invitation-event-header.interface.js';
import { InvitationAcceptedEvent } from '../events/invitation-accepted.event.js';
import { InvitationCreatedEvent } from '../events/invitation-created.event.js';
import { InvitationDispatchedEvent } from '../events/invitation-dispatched.event.js';
import { InvitationRemovedEvent } from '../events/invitation-removed.event.js';
import { InvitationRevokedEvent } from '../events/invitation-revoked.event.js';
import { InvitationAlreadyAcceptedException } from '../exceptions/invitation-already-accepted.exception.js';
import { InvitationRevokedException } from '../exceptions/invitation-revoked.exception.js';
import { type InvitationCreatableInterface } from '../interfaces/invitation-creatable.interface.js';
import { type InvitationInterface } from '../interfaces/invitation.interface.js';

export class Invitation extends DomainAggregate<InvitationInterface> {
  constructor(
    id: string,
    props: InvitationInterface,
    version?: number,
    meta?: AggregateMetaInterface,
  ) {
    super(id, props, version, meta);
  }

  get code() {
    return this.props.code;
  }
  get category() {
    return this.props.category;
  }
  get userId() {
    return this.props.userId;
  }
  get constraints() {
    return this.props.constraints;
  }
  get dateAccepted() {
    return this.props.dateAccepted;
  }
  get dateRevoked() {
    return this.props.dateRevoked;
  }

  get active(): boolean {
    return this.props.dateAccepted === null && this.props.dateRevoked === null;
  }

  get isAccepted(): boolean {
    return this.props.dateAccepted !== null;
  }

  get isRevoked(): boolean {
    return this.props.dateRevoked !== null;
  }

  static create(
    eventContext: EventContextHost<InvitationEventHeaderInterface>,
    dto: InvitationCreatableInterface,
  ): Invitation {
    return Invitation.createWithId(eventContext, randomUUID(), dto);
  }

  static createWithId(
    eventContext: EventContextHost<InvitationEventHeaderInterface>,
    id: string,
    dto: InvitationCreatableInterface,
  ): Invitation {
    const { code, category, userId, constraints } = dto;

    const invitation = new Invitation(id, {
      code,
      category,
      userId,
      constraints: constraints ?? undefined,
      dateAccepted: null,
      dateRevoked: null,
    });

    invitation.apply(
      new InvitationCreatedEvent(eventContext, invitation.toPlain()),
    );

    return invitation;
  }

  accept(
    eventContext: EventContextHost<InvitationEventHeaderInterface>,
    payload?: PlainLiteralObject,
  ): void {
    if (this.isAccepted) {
      throw new InvitationAlreadyAcceptedException();
    }

    if (this.isRevoked) {
      throw new InvitationRevokedException();
    }

    this.props.dateAccepted = new Date();

    this.apply(
      new InvitationAcceptedEvent(eventContext, this.toPlain(), payload),
    );
  }

  dispatch(
    eventContext: EventContextHost<
      InvitationEventHeaderInterface,
      InvitationDispatchedMetadataInterface
    >,
  ): void {
    this.apply(new InvitationDispatchedEvent(eventContext, this.toPlain()));
  }

  remove(eventContext: EventContextHost<InvitationEventHeaderInterface>): void {
    this.apply(new InvitationRemovedEvent(eventContext, this.toPlain()));
  }

  revoke(eventContext: EventContextHost<InvitationEventHeaderInterface>): void {
    if (this.isRevoked) {
      return;
    }

    if (this.isAccepted) {
      throw new InvitationAlreadyAcceptedException();
    }

    this.props.dateRevoked = new Date();

    this.apply(new InvitationRevokedEvent(eventContext, this.toPlain()));
  }
}

Invitation satisfies DomainFactory<InvitationCreatableInterface, Invitation>;
