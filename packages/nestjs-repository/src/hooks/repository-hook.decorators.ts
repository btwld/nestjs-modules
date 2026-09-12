import {
  type HookMethodKeyType,
  type HookMethodMetadataInterface,
  type SpecificationInterface,
  createHookMethodDecorator,
  Hook,
  type HookTypeInterface,
} from '@concepta/nestjs-core';

/**
 * Repository hook method keys.
 * Used with createHookMethodDecorator to create type-safe hook decorators.
 */
export const RepoHookMethodKey = {
  // High-level semantic keys
  BEFORE_READ: 'beforeRead',
  AFTER_READ: 'afterRead',
  BEFORE_WRITE: 'beforeWrite',
  AFTER_WRITE: 'afterWrite',
  BEFORE_TRANSITION: 'beforeTransition',
  AFTER_TRANSITION: 'afterTransition',
  BEFORE_DESTROY: 'beforeDestroy',
  AFTER_DESTROY: 'afterDestroy',

  // Fine-grained method keys
  BEFORE_FIND: 'beforeFind',
  AFTER_FIND: 'afterFind',
  BEFORE_FIND_ONE: 'beforeFindOne',
  AFTER_FIND_ONE: 'afterFindOne',
  BEFORE_COUNT: 'beforeCount',
  AFTER_COUNT: 'afterCount',
  BEFORE_FIND_AND_COUNT: 'beforeFindAndCount',
  AFTER_FIND_AND_COUNT: 'afterFindAndCount',
  BEFORE_CREATE: 'beforeCreate',
  AFTER_CREATE: 'afterCreate',
  BEFORE_CREATE_MANY: 'beforeCreateMany',
  AFTER_CREATE_MANY: 'afterCreateMany',
  BEFORE_UPDATE: 'beforeUpdate',
  AFTER_UPDATE: 'afterUpdate',
  BEFORE_UPSERT: 'beforeUpsert',
  AFTER_UPSERT: 'afterUpsert',
  BEFORE_REPLACE: 'beforeReplace',
  AFTER_REPLACE: 'afterReplace',
  BEFORE_DELETE: 'beforeDelete',
  AFTER_DELETE: 'afterDelete',
  BEFORE_DELETE_MANY: 'beforeDeleteMany',
  AFTER_DELETE_MANY: 'afterDeleteMany',
  BEFORE_SOFT_DELETE: 'beforeSoftDelete',
  AFTER_SOFT_DELETE: 'afterSoftDelete',
  BEFORE_RESTORE: 'beforeRestore',
  AFTER_RESTORE: 'afterRestore',
} as const;

// =============================================================================
// Repository Hook Type Decorator
// =============================================================================

/**
 * Marks a class as a repository hook.
 *
 * @param spec - Optional specification for when this hook applies
 *
 * @example
 * ```typescript
 * @RepoHook()
 * export class TenantHook {
 *   @BeforeFind()
 *   addTenantFilter(options, ctx) { ... }
 * }
 *
 * @RepoHook(Spec.entity('User'))
 * export class UserOnlyHook {
 *   @AfterCreate()
 *   notifyUserCreated(result, ctx) { ... }
 * }
 * ```
 */
export function RepoHook(spec?: SpecificationInterface): ClassDecorator {
  return Hook({ type: RepoHook, spec });
}

RepoHook.KEY = 'RepositoryHook';
Object.freeze(RepoHook);

// Type assertion for HookTypeInterface
export const RepoHookType: HookTypeInterface = RepoHook;

// =============================================================================
// Write Hook Options
// =============================================================================

/**
 * Options accepted by the five single-entity write decorators
 * (`@BeforeWrite`, `@BeforeCreate`, `@BeforeUpdate`, `@BeforeUpsert`,
 * `@BeforeReplace`).
 */
export interface RepoWriteHookOptions {
  /**
   * By default, a write hook's output is merged onto the caller's payload
   * and the caller wins on conflict — the hook can only fill in fields the
   * caller omitted. Set `replace: true` to invert that: the hook's output
   * replaces the caller's payload wholesale, regardless of what the caller
   * supplied. Use this for authorization decisions (e.g. stamping a
   * tenant/territory id) — never for enrichment, where the default (caller
   * wins) is almost always what you want.
   *
   * "Wholesale" is not per-field: unlike the default (merge) behavior, a
   * `replace: true` hook that returns a partial object without spreading
   * `...data` first will silently drop every other field from the payload.
   * Always spread the incoming data unless you specifically mean to discard
   * the rest of it.
   */
  replace?: boolean;
}

/**
 * Predicates over a write hook method's metadata, matching
 * `RepoWriteHookOptions.replace`. Used internally to split each write
 * decorator's method key into two disjoint execution passes — see
 * `RepoPermeatorFactory`.
 */
export const RepoHookStrategy = {
  merge: (metadata: HookMethodMetadataInterface): boolean =>
    metadata.options?.replace !== true,
  replace: (metadata: HookMethodMetadataInterface): boolean =>
    metadata.options?.replace === true,
} as const;

function isSpecification(
  value: SpecificationInterface | RepoWriteHookOptions,
): value is SpecificationInterface {
  return 'isSatisfiedBy' in value && typeof value.isSatisfiedBy === 'function';
}

/**
 * Creates a write hook method decorator that accepts either a
 * `SpecificationInterface` (as every other hook decorator does) or
 * `RepoWriteHookOptions`.
 *
 * @example
 * ```typescript
 * @BeforeCreate()                                    // merge, caller wins (default)
 * @BeforeCreate(RepoSpec.isEntity('user'))            // merge, scoped
 * @BeforeCreate({ replace: true })                    // replace, hook wins
 * @BeforeCreate(RepoSpec.isEntity('user'), { replace: true }) // both
 * ```
 */
function createWriteHookDecorator(key: HookMethodKeyType) {
  const decorate = createHookMethodDecorator(key);
  return (
    specOrOptions?: SpecificationInterface | RepoWriteHookOptions,
    options?: RepoWriteHookOptions,
  ): MethodDecorator =>
    specOrOptions && isSpecification(specOrOptions)
      ? decorate(specOrOptions, options)
      : decorate(undefined, specOrOptions);
}

// =============================================================================
// High-Level Semantic Decorators (catch-all)
// =============================================================================

/**
 * Runs before any read operation (find, findOne, count, findAndCount).
 */
export const BeforeRead = createHookMethodDecorator(
  RepoHookMethodKey.BEFORE_READ,
);

/**
 * Runs after any read operation (find, findOne, count, findAndCount).
 */
export const AfterRead = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_READ,
);

/**
 * Runs before any write operation (create, createMany, update, upsert, replace).
 *
 * For single-entity writes (create/update/upsert/replace), accepts
 * `{ replace: true }` to make this hook's output win over the caller's
 * payload instead of the default (caller wins) — see `RepoWriteHookOptions`.
 * `createMany` already treats hook output as authoritative regardless of
 * this option.
 */
export const BeforeWrite = createWriteHookDecorator(
  RepoHookMethodKey.BEFORE_WRITE,
);

/**
 * Runs after any write operation (create, createMany, update, upsert, replace).
 */
export const AfterWrite = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_WRITE,
);

/**
 * Runs before any lifecycle transition (softRemove, restore).
 */
export const BeforeTransition = createHookMethodDecorator(
  RepoHookMethodKey.BEFORE_TRANSITION,
);

/**
 * Runs after any lifecycle transition (softRemove, restore).
 */
export const AfterTransition = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_TRANSITION,
);

/**
 * Runs before any destroy operation (remove - hard delete).
 */
export const BeforeDestroy = createHookMethodDecorator(
  RepoHookMethodKey.BEFORE_DESTROY,
);

/**
 * Runs after any destroy operation (remove - hard delete).
 */
export const AfterDestroy = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_DESTROY,
);

// =============================================================================
// Fine-Grained Method Decorators - Query
// =============================================================================

/**
 * Runs before find() - query for multiple entities.
 */
export const BeforeFind = createHookMethodDecorator(
  RepoHookMethodKey.BEFORE_FIND,
);

/**
 * Runs after find() - query for multiple entities.
 */
export const AfterFind = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_FIND,
);

/**
 * Runs before findOne() - query for a single entity.
 */
export const BeforeFindOne = createHookMethodDecorator(
  RepoHookMethodKey.BEFORE_FIND_ONE,
);

/**
 * Runs after findOne() - query for a single entity.
 */
export const AfterFindOne = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_FIND_ONE,
);

/**
 * Runs before count() - count entities.
 */
export const BeforeCount = createHookMethodDecorator(
  RepoHookMethodKey.BEFORE_COUNT,
);

/**
 * Runs after count() - count entities.
 */
export const AfterCount = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_COUNT,
);

/**
 * Runs before findAndCount() - query and count entities.
 */
export const BeforeFindAndCount = createHookMethodDecorator(
  RepoHookMethodKey.BEFORE_FIND_AND_COUNT,
);

/**
 * Runs after findAndCount() - query and count entities.
 */
export const AfterFindAndCount = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_FIND_AND_COUNT,
);

// =============================================================================
// Fine-Grained Method Decorators - Create
// =============================================================================

/**
 * Runs before create() - create a single entity.
 *
 * Accepts `{ replace: true }` to make this hook's output win over the
 * caller's payload instead of the default (caller wins) — see
 * `RepoWriteHookOptions`.
 */
export const BeforeCreate = createWriteHookDecorator(
  RepoHookMethodKey.BEFORE_CREATE,
);

/**
 * Runs after create() - create a single entity.
 */
export const AfterCreate = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_CREATE,
);

/**
 * Runs before createMany() - create multiple entities.
 */
export const BeforeCreateMany = createHookMethodDecorator(
  RepoHookMethodKey.BEFORE_CREATE_MANY,
);

/**
 * Runs after createMany() - create multiple entities.
 */
export const AfterCreateMany = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_CREATE_MANY,
);

// =============================================================================
// Fine-Grained Method Decorators - Update
// =============================================================================

/**
 * Runs before update() - update an existing entity.
 *
 * Accepts `{ replace: true }` to make this hook's output win over the
 * caller's payload instead of the default (caller wins) — see
 * `RepoWriteHookOptions`.
 */
export const BeforeUpdate = createWriteHookDecorator(
  RepoHookMethodKey.BEFORE_UPDATE,
);

/**
 * Runs after update() - update an existing entity.
 */
export const AfterUpdate = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_UPDATE,
);

/**
 * Runs before upsert() - create or update an entity.
 *
 * Accepts `{ replace: true }` to make this hook's output win over the
 * caller's payload instead of the default (caller wins) — see
 * `RepoWriteHookOptions`.
 */
export const BeforeUpsert = createWriteHookDecorator(
  RepoHookMethodKey.BEFORE_UPSERT,
);

/**
 * Runs after upsert() - create or update an entity.
 */
export const AfterUpsert = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_UPSERT,
);

/**
 * Runs before replace() - fully replace an existing entity.
 *
 * Accepts `{ replace: true }` to make this hook's output win over the
 * caller's payload instead of the default (caller wins) — see
 * `RepoWriteHookOptions`.
 */
export const BeforeReplace = createWriteHookDecorator(
  RepoHookMethodKey.BEFORE_REPLACE,
);

/**
 * Runs after replace() - fully replace an existing entity.
 */
export const AfterReplace = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_REPLACE,
);

// =============================================================================
// Fine-Grained Method Decorators - Delete (hard delete)
// =============================================================================

/**
 * Runs before delete() - permanently delete an entity.
 */
export const BeforeDelete = createHookMethodDecorator(
  RepoHookMethodKey.BEFORE_DELETE,
);

/**
 * Runs after delete() - permanently delete an entity.
 */
export const AfterDelete = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_DELETE,
);

/**
 * Runs before deleteMany() - permanently delete multiple entities.
 */
export const BeforeDeleteMany = createHookMethodDecorator(
  RepoHookMethodKey.BEFORE_DELETE_MANY,
);

/**
 * Runs after deleteMany() - permanently delete multiple entities.
 */
export const AfterDeleteMany = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_DELETE_MANY,
);

// =============================================================================
// Fine-Grained Method Decorators - Lifecycle (soft delete/restore)
// =============================================================================

/**
 * Runs before softDelete() - soft delete an entity.
 */
export const BeforeSoftDelete = createHookMethodDecorator(
  RepoHookMethodKey.BEFORE_SOFT_DELETE,
);

/**
 * Runs after softDelete() - soft delete an entity.
 */
export const AfterSoftDelete = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_SOFT_DELETE,
);

/**
 * Runs before restore() - restore a soft-deleted entity.
 */
export const BeforeRestore = createHookMethodDecorator(
  RepoHookMethodKey.BEFORE_RESTORE,
);

/**
 * Runs after restore() - restore a soft-deleted entity.
 */
export const AfterRestore = createHookMethodDecorator(
  RepoHookMethodKey.AFTER_RESTORE,
);
