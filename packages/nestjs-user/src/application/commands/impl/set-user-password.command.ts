import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type UserCredentials } from '../../../domain/aggregates/user-credentials.js';

export class SetUserPasswordCommand extends Command<UserCredentials> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly userId: ReferenceId,
    public readonly password: string,
  ) {
    super();
  }
}
