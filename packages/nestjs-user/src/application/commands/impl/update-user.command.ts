import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type User } from '../../../domain/aggregates/user.js';
import { type UserUpdatableInterface } from '../../../domain/interfaces/user-updatable.interface.js';

export class UpdateUserCommand extends Command<User> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly id: ReferenceId,
    public readonly dto: Partial<UserUpdatableInterface>,
  ) {
    super();
  }
}
