import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type OtpInterface } from '../../../domain/interfaces/otp.interface.js';

interface ClearOtpHistoryCommandOptions {
  keepHistoryDays?: number;
}

export class ClearOtpHistoryCommand extends Command<void> {
  public readonly keepHistoryDays?: number;

  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly otp: Pick<OtpInterface, 'assigneeId' | 'category'>,
    options?: ClearOtpHistoryCommandOptions,
  ) {
    super();
    this.keepHistoryDays = options?.keepHistoryDays;
  }
}
