import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';
import { type RepositoryInterface, Where } from '@concepta/nestjs-repository';

import { type Cache } from '../../domain/aggregates/cache.js';
import { type CacheRepositoryInterface } from '../../domain/repositories/cache-repository.interface.js';

import { type CacheMapper } from './cache.mapper.js';
import { type CacheEntityInterface } from './interfaces/cache-entity.interface.js';

export class CacheRepository implements CacheRepositoryInterface {
  constructor(
    protected readonly repository: RepositoryInterface<CacheEntityInterface>,
    private readonly mapper: CacheMapper,
  ) {}

  async get(ctx: PlainLiteralObject, id: ReferenceId): Promise<Cache | null> {
    const w = Where.for<CacheEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.eq('id', id),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findOne(
    ctx: PlainLiteralObject,
    options: { key: string; type: string; assigneeId: string },
  ): Promise<Cache | null> {
    const { key, type, assigneeId } = options;
    const w = Where.for<CacheEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.and(
        w.eq('key', key),
        w.eq('type', type),
        w.eq('assigneeId', assigneeId),
      ),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findAllByAssignee(
    ctx: PlainLiteralObject,
    assigneeId: string,
  ): Promise<Cache[]> {
    const w = Where.for<CacheEntityInterface>();

    const entities = await this.repository.find({
      where: w.eq('assigneeId', assigneeId),
      ctx,
    });

    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(ctx: PlainLiteralObject, cache: Cache): Promise<void> {
    cache.stampUpdated();
    await this.repository.upsert(this.mapper.toPersistence(cache), { ctx });
  }

  async remove(ctx: PlainLiteralObject, cache: Cache): Promise<void> {
    await this.repository.delete(this.mapper.toPersistence(cache), { ctx });
  }

  async removeAllByAssignee(
    ctx: PlainLiteralObject,
    assigneeId: string,
  ): Promise<void> {
    const caches = await this.findAllByAssignee(ctx, assigneeId);

    await this.repository.deleteMany(
      caches.map((cache) => this.mapper.toPersistence(cache)),
      { ctx },
    );
  }

  async softRemove(ctx: PlainLiteralObject, cache: Cache): Promise<void> {
    cache.stampDeleted();
    await this.repository.softDelete(this.mapper.toPersistence(cache), { ctx });
  }
}
