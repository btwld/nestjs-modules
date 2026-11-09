import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type Role } from '../aggregates/role.js';

export interface RoleRepositoryInterface {
  get(ctx: PlainLiteralObject, id: ReferenceId): Promise<Role | null>;

  save(ctx: PlainLiteralObject, role: Role): Promise<void>;

  remove(ctx: PlainLiteralObject, role: Role): Promise<void>;
}
