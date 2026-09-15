export { CacheModule } from './cache.module.js';

// domain interfaces
export { CacheInterface } from './domain/interfaces/cache.interface.js';
export { CacheCreatableInterface } from './domain/interfaces/cache-creatable.interface.js';
export { CacheUpdatableInterface } from './domain/interfaces/cache-updatable.interface.js';

// domain object
export { Cache } from './domain/aggregates/cache.js';

// policies
export {
  CacheExpirationPolicy,
  CacheExpirationSettings,
} from './domain/policies/cache-expiration.policy.js';

// repositories
export { CacheRepository } from './infrastructure/persistence/cache.repository.js';
export { CacheRepositoryResolver } from './infrastructure/persistence/cache-repository.resolver.js';
export { CacheRepositoryInterface } from './domain/repositories/cache-repository.interface.js';
export { CacheRepositoryResolverInterface } from './domain/repositories/cache-repository-resolver.interface.js';

// interfaces
export { CacheExtrasInterface } from './infrastructure/config/interfaces/cache-extras.interface.js';

// schemas (Zod / Standard Schema)
export { cacheCreateSchema } from './infrastructure/schemas/cache-create.schema.js';
export { cacheUpdateSchema } from './infrastructure/schemas/cache-update.schema.js';
export { cacheSchema } from './infrastructure/schemas/cache.schema.js';

// domain commands
export { UpsertCacheCommand } from './application/commands/impl/upsert-cache.command.js';
export { ClearCachesByAssigneeCommand } from './application/commands/impl/clear-caches-by-assignee.command.js';
export { CreateCacheCommand } from './application/commands/impl/create-cache.command.js';
export { UpdateCacheCommand } from './application/commands/impl/update-cache.command.js';
export { RemoveCacheCommand } from './application/commands/impl/remove-cache.command.js';
export { ReplaceCacheCommand } from './application/commands/impl/replace-cache.command.js';
export { ArchiveCacheCommand } from './application/commands/impl/archive-cache.command.js';

// domain events
export { CacheCreatedEvent } from './domain/events/cache-created.event.js';
export { CacheUpdatedEvent } from './domain/events/cache-updated.event.js';
export { CacheReplacedEvent } from './domain/events/cache-replaced.event.js';
export { CacheExtendedEvent } from './domain/events/cache-extended.event.js';

// domain queries
export { GetCacheQuery } from './application/queries/impl/get-cache.query.js';
export { FindOneCacheQuery } from './application/queries/impl/find-one-cache.query.js';
export { FindCachesByAssigneeQuery } from './application/queries/impl/find-caches-by-assignee.query.js';

// domain handlers
export { UpsertCacheHandler } from './application/commands/handlers/upsert-cache.handler.js';
export { ClearCachesByAssigneeHandler } from './application/commands/handlers/clear-caches-by-assignee.handler.js';
export { CreateCacheHandler } from './application/commands/handlers/create-cache.handler.js';
export { UpdateCacheHandler } from './application/commands/handlers/update-cache.handler.js';
export { RemoveCacheHandler } from './application/commands/handlers/remove-cache.handler.js';
export { ReplaceCacheHandler } from './application/commands/handlers/replace-cache.handler.js';
export { ArchiveCacheHandler } from './application/commands/handlers/archive-cache.handler.js';
export { GetCacheHandler } from './application/queries/handlers/get-cache.handler.js';
export { FindOneCacheHandler } from './application/queries/handlers/find-one-cache.handler.js';
export { FindCachesByAssigneeHandler } from './application/queries/handlers/find-caches-by-assignee.handler.js';

// context overlay
export {
  CacheContextOverlay,
  CacheCtx,
} from './gateways/cache-context.overlay.js';

// decorators
export { CacheNamespace } from './gateways/decorators/cache-namespace.decorator.js';

// exceptions
export { CacheException } from './domain/exceptions/cache.exception.js';
export { CacheEntityNotFoundException } from './infrastructure/exceptions/cache-entity-not-found.exception.js';
export { CacheInvalidExpiredDateException } from './domain/exceptions/cache-invalid-expired-date.exception.js';
export { CacheNotFoundException } from './application/exceptions/cache-not-found.exception.js';
