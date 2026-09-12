import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type ReferenceSubject } from '@concepta/nestjs-core';

import { type User } from '../../../domain/aggregates/user.js';

export class GetUserBySubjectQuery extends Query<User | null> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly subject: ReferenceSubject,
  ) {
    super();
  }
}
