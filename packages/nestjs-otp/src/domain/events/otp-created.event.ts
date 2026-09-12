import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type OtpInterface } from '../interfaces/otp.interface.js';

import { type OtpEventHeaderInterface } from './interfaces/otp-event-header.interface.js';

export class OtpCreatedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost<OtpEventHeaderInterface>,
    public readonly otp: OtpInterface,
  ) {}
}
