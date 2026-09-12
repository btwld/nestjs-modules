import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type Otp } from '../aggregates/otp.js';

export interface OtpRepositoryInterface {
  get(ctx: PlainLiteralObject, id: ReferenceId): Promise<Otp | null>;

  findActiveByPasscode(
    ctx: PlainLiteralObject,
    options: { category: string; passcode: string },
  ): Promise<Otp | null>;

  findByPasscode(
    ctx: PlainLiteralObject,
    options: { category: string; passcode: string },
  ): Promise<Otp | null>;

  findActiveByAssignee(
    ctx: PlainLiteralObject,
    options: { assigneeId: string; category: string },
  ): Promise<Otp | null>;

  findAllByAssigneeAndCategory(
    ctx: PlainLiteralObject,
    options: { assigneeId: string; category: string },
  ): Promise<Otp[]>;

  countCreatedSince(
    ctx: PlainLiteralObject,
    options: { assigneeId: string; category: string; cutoffDate: Date },
  ): Promise<number>;

  findOlderThan(
    ctx: PlainLiteralObject,
    options: { assigneeId: string; category: string; cutoffDate: Date },
  ): Promise<Otp[]>;

  save(ctx: PlainLiteralObject, otp: Otp): Promise<void>;

  remove(ctx: PlainLiteralObject, otp: Otp): Promise<void>;

  removeAll(ctx: PlainLiteralObject, otps: Otp[]): Promise<void>;
}
