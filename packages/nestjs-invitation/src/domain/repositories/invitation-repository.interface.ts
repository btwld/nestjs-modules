import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type Invitation } from '../aggregates/invitation.js';

export interface InvitationRepositoryInterface {
  get(ctx: PlainLiteralObject, id: ReferenceId): Promise<Invitation | null>;

  findOneByCode(
    ctx: PlainLiteralObject,
    code: string,
  ): Promise<Invitation | null>;

  findAllByUserAndCategory(
    ctx: PlainLiteralObject,
    userId: ReferenceId,
    category: string,
  ): Promise<Invitation[]>;

  save(ctx: PlainLiteralObject, invitation: Invitation): Promise<void>;

  remove(ctx: PlainLiteralObject, invitation: Invitation): Promise<void>;
}
