import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type Invitation } from '../../../domain/aggregates/invitation.js';

export class FindInvitationByCodeQuery extends Query<Invitation | null> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly code: string,
  ) {
    super();
  }
}
