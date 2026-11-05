import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when an entity is registered on a data source that
 * caches every query (`cache.alwaysEnabled`). The reads that check a
 * versioned write, and the one `save()` makes before it writes, would come
 * from the cache rather than the database, so a write could overwrite a
 * newer row.
 */
export class TypeOrmQueryCacheException extends RuntimeException {
  declare context: RuntimeException['context'] & { entityName: string };

  /**
   * @param entityName - The entity registered on the data source
   */
  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message:
        'Entity %s uses a data source that caches every query: turn off ' +
        'cache.alwaysEnabled',
      messageParams: [entityName],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, entityName };
    this.errorCode = 'TYPEORM_QUERY_CACHE';
  }
}
