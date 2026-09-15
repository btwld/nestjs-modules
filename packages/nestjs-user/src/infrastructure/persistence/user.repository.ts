import { type PlainLiteralObject } from '@nestjs/common';

import {
  type ReferenceEmail,
  type ReferenceId,
  type ReferenceUsername,
} from '@concepta/nestjs-core';
import { type RepositoryInterface, Where } from '@concepta/nestjs-repository';

import { type User } from '../../domain/aggregates/user.js';
import { type UserEntityInterface } from '../../domain/interfaces/user-entity.interface.js';
import { type UserRepositoryInterface } from '../../domain/repositories/user-repository.interface.js';

import { type UserMapper } from './user.mapper.js';

export class UserRepository implements UserRepositoryInterface {
  constructor(
    protected readonly repository: RepositoryInterface<UserEntityInterface>,
    private readonly mapper: UserMapper,
  ) {}

  async get(ctx: PlainLiteralObject, id: ReferenceId): Promise<User | null> {
    const w = Where.for<UserEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.eq('id', id),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByEmail(
    ctx: PlainLiteralObject,
    email: ReferenceEmail,
  ): Promise<User | null> {
    const w = Where.for<UserEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.eq('email', email),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByUsername(
    ctx: PlainLiteralObject,
    username: ReferenceUsername,
  ): Promise<User | null> {
    const w = Where.for<UserEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.eq('username', username),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async save(ctx: PlainLiteralObject, user: User): Promise<void> {
    user.stampUpdated();
    await this.repository.upsert(this.mapper.toPersistence(user), { ctx });
  }

  async remove(ctx: PlainLiteralObject, user: User): Promise<void> {
    await this.repository.delete(this.mapper.toPersistence(user), { ctx });
  }
}
