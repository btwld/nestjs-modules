import { type PlainLiteralObject } from '@nestjs/common';

import {
  type ReferenceEmail,
  type ReferenceId,
  type ReferenceUsername,
} from '@concepta/nestjs-core';

import { type User } from '../aggregates/user.js';

export interface UserRepositoryInterface {
  get(ctx: PlainLiteralObject, id: ReferenceId): Promise<User | null>;

  findByEmail(
    ctx: PlainLiteralObject,
    email: ReferenceEmail,
  ): Promise<User | null>;

  findByUsername(
    ctx: PlainLiteralObject,
    username: ReferenceUsername,
  ): Promise<User | null>;

  save(ctx: PlainLiteralObject, user: User): Promise<void>;

  remove(ctx: PlainLiteralObject, user: User): Promise<void>;
}
