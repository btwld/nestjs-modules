import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type ReferenceEmail } from '@concepta/nestjs-core';

import { type User } from '../../../domain/aggregates/user.js';

export class GetUserByEmailQuery extends Query<User | null> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: ReferenceEmail,
  ) {
    super();
  }
}
