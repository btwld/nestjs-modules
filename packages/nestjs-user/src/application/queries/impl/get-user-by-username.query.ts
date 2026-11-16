import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type ReferenceUsername } from '@concepta/nestjs-core';

import { type User } from '../../../domain/aggregates/user.js';

export class GetUserByUsernameQuery extends Query<User | null> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly username: ReferenceUsername,
  ) {
    super();
  }
}
