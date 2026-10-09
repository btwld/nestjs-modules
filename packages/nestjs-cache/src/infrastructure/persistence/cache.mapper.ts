import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { Cache } from '../../domain/aggregates/cache.js';

import { type CacheEntityInterface } from './interfaces/cache-entity.interface.js';

export class CacheMapper extends DomainMapper<CacheEntityInterface, Cache> {
  createAggregate(entity: CacheEntityInterface): Cache {
    const { id, version, dateCreated, dateUpdated, dateDeleted, ...props } =
      entity;

    return new Cache(id, props, version, {
      dateCreated,
      dateUpdated,
      dateDeleted,
    });
  }

  toPersistence(cache: Cache) {
    return cache.toPlain();
  }
}
