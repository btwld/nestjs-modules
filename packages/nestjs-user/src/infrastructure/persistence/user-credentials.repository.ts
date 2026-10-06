import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';
import {
  OrderBy,
  type RepositoryInterface,
  Where,
} from '@concepta/nestjs-repository';

import { type UserCredentials } from '../../domain/aggregates/user-credentials.js';
import { type UserCredentialEntityInterface } from '../../domain/interfaces/user-credential-entity.interface.js';
import { type UserCredentialsRepositoryInterface } from '../../domain/repositories/user-credentials-repository.interface.js';

import { type UserCredentialsMapper } from './user-credentials.mapper.js';

export class UserCredentialsRepository implements UserCredentialsRepositoryInterface {
  constructor(
    protected readonly repository: RepositoryInterface<UserCredentialEntityInterface>,
    private readonly mapper: UserCredentialsMapper,
  ) {}

  async findActiveByUserId(
    ctx: PlainLiteralObject,
    userId: ReferenceId,
  ): Promise<UserCredentials | null> {
    const w = Where.for<UserCredentialEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.and(w.eq('userId', userId), w.eq('active', true)),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByUserId(
    ctx: PlainLiteralObject,
    userId: ReferenceId,
    limitDate?: Date,
  ): Promise<UserCredentials[]> {
    const w = Where.for<UserCredentialEntityInterface>();

    const conditions = [w.eq('userId', userId)];

    if (limitDate) {
      conditions.push(w.gte('validFrom', limitDate));
    }

    const entities = await this.repository.find({
      where: w.and(...conditions),
      order: [OrderBy.desc<UserCredentialEntityInterface>('validFrom')],
      ctx,
    });

    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(ctx: PlainLiteralObject, entry: UserCredentials): Promise<void> {
    entry.stampUpdated();
    await this.repository.upsert(this.mapper.toPersistence(entry), { ctx });
  }
}
