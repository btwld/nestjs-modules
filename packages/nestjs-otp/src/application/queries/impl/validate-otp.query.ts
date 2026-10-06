import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type AssigneeRelationInterface } from '@concepta/nestjs-core';

import { type OtpInterface } from '../../../domain/interfaces/otp.interface.js';

export class ValidateOtpQuery extends Query<AssigneeRelationInterface | null> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly otp: Pick<OtpInterface, 'category' | 'passcode'>,
  ) {
    super();
  }
}
