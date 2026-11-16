import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type Identity } from '../aggregates/identity.js';

export interface IdentityRepositoryInterface {
  get(ctx: PlainLiteralObject, id: ReferenceId): Promise<Identity | null>;

  findByProviderAndSubject(
    ctx: PlainLiteralObject,
    provider: string,
    subject: string,
  ): Promise<Identity | null>;

  save(ctx: PlainLiteralObject, identity: Identity): Promise<void>;

  remove(ctx: PlainLiteralObject, identity: Identity): Promise<void>;
}
