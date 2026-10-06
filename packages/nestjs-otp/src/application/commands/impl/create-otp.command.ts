import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type Otp } from '../../../domain/aggregates/otp.js';
import { type OtpCreatableInterface } from '../../../domain/interfaces/otp-creatable.interface.js';

interface CreateOtpCommandOptions {
  duplicateStrategy?: 'ALLOW' | 'DEACTIVATE';
  rateSeconds?: number;
  rateThreshold?: number;
}

export class CreateOtpCommand extends Command<Otp> {
  public readonly duplicateStrategy?: CreateOtpCommandOptions['duplicateStrategy'];
  public readonly rateSeconds?: number;
  public readonly rateThreshold?: number;

  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly dto: OtpCreatableInterface,
    options?: CreateOtpCommandOptions,
  ) {
    super();
    this.duplicateStrategy = options?.duplicateStrategy;
    this.rateSeconds = options?.rateSeconds;
    this.rateThreshold = options?.rateThreshold;
  }
}
