import { randomUUID } from 'crypto';

import {
  type DomainFactory,
  type EventContextHost,
} from '@concepta/nestjs-core';
import { DomainAggregate } from '@concepta/nestjs-core/aggregate';

import { type OtpEventHeaderInterface } from '../events/interfaces/otp-event-header.interface.js';
import { OtpConsumedEvent } from '../events/otp-consumed.event.js';
import { OtpCreatedEvent } from '../events/otp-created.event.js';
import { OtpDeactivatedEvent } from '../events/otp-deactivated.event.js';
import { type OtpInterface } from '../interfaces/otp.interface.js';
import { getExpirationDate } from '../utils/get-expiration-date.util.js';

export interface OtpCreateProps {
  category: string;
  type: string;
  assigneeId: string;
  passcode: string;
  expiresIn: string;
}

export class Otp extends DomainAggregate<OtpInterface> {
  get category() {
    return this.props.category;
  }

  get type() {
    return this.props.type;
  }

  get passcode() {
    return this.props.passcode;
  }

  get assigneeId() {
    return this.props.assigneeId;
  }

  get expirationDate() {
    return this.props.expirationDate;
  }

  get active() {
    return this.props.active;
  }

  static create(
    eventContext: EventContextHost<OtpEventHeaderInterface>,
    props: OtpCreateProps,
  ): Otp {
    return Otp.createWithId(eventContext, randomUUID(), props);
  }

  static createWithId(
    eventContext: EventContextHost<OtpEventHeaderInterface>,
    id: string,
    props: OtpCreateProps,
  ): Otp {
    const { category, type, assigneeId, passcode, expiresIn } = props;
    const now = new Date();

    const otp = new Otp(id, {
      category,
      type,
      assigneeId,
      passcode,
      expirationDate: getExpirationDate(expiresIn, now),
      active: true,
    });

    otp.apply(new OtpCreatedEvent(eventContext, otp.toPlain()));

    return otp;
  }

  deactivate(eventContext: EventContextHost<OtpEventHeaderInterface>): void {
    this.props = {
      ...this.props,
      active: false,
    };

    this.incrementVersion();

    this.apply(new OtpDeactivatedEvent(eventContext, this.toPlain()));
  }

  consume(eventContext: EventContextHost<OtpEventHeaderInterface>): void {
    this.apply(new OtpConsumedEvent(eventContext, this.toPlain()));
  }

  isExpired(now: Date = new Date()): boolean {
    return now > this.props.expirationDate;
  }
}

Otp satisfies DomainFactory<OtpCreateProps, Otp>;
