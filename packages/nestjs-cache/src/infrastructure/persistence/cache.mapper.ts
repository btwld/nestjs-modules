import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { Cache } from '../../domain/aggregates/cache.js';

import { type CacheEntityInterface } from './interfaces/cache-entity.interface.js';

export class CacheMapper extends DomainMapper<CacheEntityInterface, Cache> {
  /**
   * Picks the cache's own fields, so a relation the consumer's entity loads
   * never reaches the aggregate, or a write.
   */
  createAggregate(entity: CacheEntityInterface): Cache {
    const {
      id,
      version,
      dateCreated,
      dateUpdated,
      dateDeleted,
      assigneeId,
      key,
      type,
      data,
      expirationDate,
    } = entity;

    return new Cache(
      id,
      { assigneeId, key, type, data, expirationDate },
      version,
      { dateCreated, dateUpdated, dateDeleted },
    );
  }

  toPersistence(cache: Cache) {
    return cache.toPlain();
  }
}
