import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type UserCredentials } from '../aggregates/user-credentials.js';

export interface UserCredentialsRepositoryInterface {
  findActiveByUserId(
    ctx: PlainLiteralObject,
    userId: ReferenceId,
  ): Promise<UserCredentials | null>;

  findByUserId(
    ctx: PlainLiteralObject,
    userId: ReferenceId,
    limitDate?: Date,
  ): Promise<UserCredentials[]>;

  save(ctx: PlainLiteralObject, entry: UserCredentials): Promise<void>;
}
