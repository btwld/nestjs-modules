import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';
import { type PasswordStorageInterface } from '@concepta/nestjs-password';

import { type UserCredentials } from '../../../domain/aggregates/user-credentials.js';

export class CreateUserCredentialCommand extends Command<UserCredentials> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly userId: ReferenceId,
    public readonly password: string | PasswordStorageInterface,
  ) {
    super();
  }
}
