import { HttpStatus, type PlainLiteralObject, type Type } from '@nestjs/common';

import {
  AppContextHost,
  type DeepPartial,
  isObject,
  RuntimeException,
  type HookMethodFilter,
  type HookMethodKeyType,
  type HookOption,
  type HookResolverService,
  type HookWithSpec,
  HooksCtx,
  normalizeHookOption,
} from '@concepta/nestjs-core';

import { RepoCtx } from '../context/interfaces/repository-context.interface.js';
import { EntityAlreadyExistsException } from '../exceptions/entity-already-exists.exception.js';
import { HookBootException } from '../exceptions/hook-boot.exception.js';
import { OptimisticLockException } from '../exceptions/optimistic-lock.exception.js';
import { PartialPrimaryKeyException } from '../exceptions/partial-primary-key.exception.js';
import { PrimaryKeyImmutableException } from '../exceptions/primary-key-immutable.exception.js';
import { SoftDeletedImmutableException } from '../exceptions/soft-deleted-immutable.exception.js';
import { type FederationOrchestrator } from '../federation/federation-orchestrator.service.js';
import { RepoPermeatorFactory } from '../hooks/repo-permeator-factory.js';
import { RepoHook } from '../hooks/repository-hook.decorators.js';
import { RowScopeBootException } from '../row-scope/exceptions/row-scope-boot.exception.js';
import { RowScopeUnboundException } from '../row-scope/exceptions/row-scope-unbound.exception.js';
import { RowScopeCtx } from '../row-scope/interfaces/row-scope-context.interface.js';
import {
  isRowScopeScoped,
  type RowScopeRegistration,
} from '../row-scope/interfaces/row-scope-registration.interface.js';
import { type RowScopeInterface } from '../row-scope/interfaces/row-scope.interface.js';
import {
  RowScopeOperation,
  type RowScopeQueryOperation,
  type RowScopeWriteOperation,
} from '../row-scope/row-scope.types.js';

import { type JoinClause } from './interfaces/join-clause.interface.js';
import { type RepositoryMetadataInterface } from './interfaces/repository-metadata.interface.js';
import {
  type RepositoryFindOptions,
  type RepositoryFindOneOptions,
  type RepositoryCreateOptions,
  type RepositoryUpdateOptions,
  type RepositoryUpsertOptions,
  type RepositoryDeleteOptions,
  type RepositoryDeleteOneOptions,
  type RepositoryRestoreOptions,
} from './interfaces/repository-options.interface.js';
import { type RepositoryVersionGuardInterface } from './interfaces/repository-version-guard.interface.js';
import { type RepositoryInterface } from './interfaces/repository.interface.js';
import {
  type WhereClause,
  isWhereCondition,
  isWhereCompound,
  isWhereNever,
} from './interfaces/where-clause.interface.js';
import { WhereCompoundOperator } from './repository.types.js';
import { Where } from './where.helpers.js';

// Module-scoped: the root cause (CoreModule not imported) is identical no
// matter how many repositories/entities hit it, so warn once per process
// rather than once per repository construction.
let warnedHooksNotWired = false;

/**
 * Abstract repository adapter that implements entity hydration.
 *
 * Concrete repository implementations should extend this class and implement
 * the protected `do*` methods. **Never override a public operation method**
 * (`find`, `create`, `update`, …): those are where hooks, row scope and the
 * soft-delete guards are invoked, so an override bypasses all of them for
 * every entity the driver serves.
 *
 * @example
 * ```typescript
 * class MyDriverRepository<Entity extends PlainLiteralObject>
 *   extends RepositoryAdapter<Entity> {
 *   protected async doFind(options?: RepositoryFindOptions<Entity>) {
 *     return this.repo.find(translate(options));
 *   }
 *
 *   protected async doCreate(entity: DeepPartial<Entity>) {
 *     return this.repo.save(entity);
 *   }
 * }
 * ```
 */
export abstract class RepositoryAdapter<
  Entity extends PlainLiteralObject,
> implements RepositoryInterface<Entity> {
  abstract readonly metadata: RepositoryMetadataInterface<Entity>;

  readonly entityKey: string;

  private _permeator?: RepoPermeatorFactory<Entity>;
  private _federationOrchestrator?: FederationOrchestrator;
  private _rowScope?: RowScopeInterface;
  private _hooks?: HookWithSpec[];
  private readonly _warnedDuplicates = new Set<Type>();

  constructor(
    entityKey: string,
    protected readonly hookResolver?: HookResolverService,
    /** Held here so the unbound state fails closed. */
    readonly rowScopeDeclaration?: RowScopeRegistration,
    /** Held for the same reason. */
    readonly hooksDeclaration?: HookOption[],
  ) {
    this.entityKey = entityKey;

    if (!hookResolver && !warnedHooksNotWired) {
      warnedHooksNotWired = true;
      process.emitWarning(
        `Repository "${entityKey}" was constructed without a HookResolverService — ` +
          'no hook will ever run for this repository (or any other, until ' +
          'CoreModule is imported), silently. Import CoreModule (e.g. ' +
          'CoreModule.forRoot()) to enable them.',
        { code: 'ROCKETS_HOOKS_NOT_WIRED' },
      );
    }
  }

  /**
   * Set the federation orchestrator for this repository.
   * When set, `findAndCount` will delegate to the orchestrator
   * for queries that include federated joins.
   */
  setFederationOrchestrator(orchestrator: FederationOrchestrator): void {
    this._federationOrchestrator = orchestrator;
  }

  /**
   * Bind this entity's resolver instance.
   *
   * The declaration arrives by constructor, but the instance can only come
   * from DI — so it is bound by `RepositoryModule.forFeature()` rather than by
   * each driver's provider factory, where a driver that forgot would fail open
   * silently.
   *
   * Binds once: enforcement that can be swapped at runtime is not enforcement.
   */
  setRowScope(rowScope: RowScopeInterface): void {
    if (this._rowScope) {
      throw new RowScopeBootException([
        `"${this.entityKey}" already has a row scope resolver bound. ` +
          'Resolvers are bound once, at startup, and cannot be replaced.',
      ]);
    }
    this._rowScope = rowScope;
  }

  /**
   * Whether a resolver is bound. Read by the boot checks.
   */
  get hasRowScopeResolver(): boolean {
    return this._rowScope !== undefined;
  }

  /**
   * Bind this entity's registered hooks.
   *
   * Bound once, by `RepositoryModule.forFeature()`, for the same reason as
   * `setRowScope`.
   */
  setHooks(hooks: HookOption[]): void {
    if (this._hooks) {
      throw new HookBootException([
        `"${this.entityKey}" already has hooks bound. Hooks are bound once, ` +
          'at startup, and cannot be replaced.',
      ]);
    }

    const normalized = hooks.map(normalizeHookOption);

    // Refused rather than deduplicated: listing a class twice for one entity
    // has no reading that differs from listing it once, so it is a typo, and
    // running it twice would be silent — a doubled stamp looks identical.
    const duplicate = normalized.find(
      (config, i) => normalized.findIndex((c) => c.hook === config.hook) !== i,
    );
    if (duplicate) {
      throw new HookBootException([
        `Hook "${duplicate.hook.name}" is registered more than once for ` +
          `"${this.entityKey}". Remove the duplicate.`,
      ]);
    }

    this._hooks = normalized;
  }

  /**
   * Whether a resolver is available to run hooks. Read by the boot checks.
   */
  get hasHookResolver(): boolean {
    return this.hookResolver !== undefined;
  }

  /**
   * Whether hooks are bound. Read by the boot checks.
   */
  get hasBoundHooks(): boolean {
    return this._hooks !== undefined;
  }

  /**
   * The bound hooks, for the boot checks to validate.
   */
  get boundHooks(): readonly HookWithSpec[] {
    return this._hooks ?? [];
  }

  /**
   * Refuse an entity whose declared hooks could never run. Without this, a
   * declaration that was missed is indistinguishable from an entity with no
   * hooks — the silent failure this registration exists to remove.
   *
   * Called from every path that would otherwise proceed hookless, including
   * the ones that return before reaching the permeator.
   */
  protected assertHooksRunnable(): void {
    if (!this.hooksDeclaration?.length) return;

    if (!this.hookResolver) {
      throw new HookBootException([
        `"${this.entityKey}" declares hooks but no HookResolverService is ` +
          'available to run them. Import CoreModule (e.g. ' +
          'CoreModule.forRoot()).',
      ]);
    }

    if (!this._hooks) {
      throw new HookBootException([
        `"${this.entityKey}" declares hooks but none were bound to it. The ` +
          'entity was registered by calling the driver module directly ' +
          'rather than through RepositoryModule.forFeature().',
      ]);
    }
  }

  /**
   * Resolve the bound resolver, refusing to serve a declared-but-unbound
   * entity. Reached before every operation, so the window between construction
   * and binding — and a declaration that nothing ever bound — both fail closed
   * rather than silently running unscoped.
   */
  private requireRowScope(): RowScopeInterface | undefined {
    if (this._rowScope) return this._rowScope;

    if (isRowScopeScoped(this.rowScopeDeclaration)) {
      throw new RowScopeUnboundException(this.entityKey);
    }

    return undefined;
  }

  protected get permeator(): RepoPermeatorFactory<Entity> {
    if (!this._permeator) {
      this._permeator = new RepoPermeatorFactory<Entity>(
        this.runHooks.bind(this),
        this.entityKey,
      );
    }
    return this._permeator;
  }

  /**
   * Build the ambient context for hook execution.
   *
   * Chains overlays via prototype inheritance so that hook methods
   * can access locals, hooks, entity, and trx through the chain.
   *
   * `entity` is installed on a fresh child scoped to this one call, not on
   * `ctx` itself — unlike trx/hooks (stable for the whole scope/request),
   * it differs per repository per call, so it can't use `defineOverlay`'s
   * idempotent "declare once" semantics without pinning to whichever
   * repository happened to touch `ctx` first.
   *
   * A call with no `ctx` still gets a host, so `RepoCtx` is present and an
   * entity-scoped specification can be evaluated. Row scope is unaffected: it
   * reads the caller's own `options.ctx`, never this, which is what stops a
   * hook deciding which principal is enforced.
   */
  protected entityCtx(ctx?: PlainLiteralObject): PlainLiteralObject {
    const appCtx = AppContextHost.from(ctx);

    const repoScoped = AppContextHost.from(Object.create(appCtx));
    repoScoped.defineOverlay(RepoCtx, { entity: this.entityKey });

    return repoScoped
      .require(RepoCtx)
      .withRepo()
      .optional()
      .withHooks()
      .optional()
      .withTrx();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Row scope invocation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Invoke the bound scope resolver for a read, and hand the driver what it
   * returns.
   *
   * Called from inside each operation's permeate callback, so scoping lands
   * after hooks and immediately before `do*` — a hook cannot run after scope
   * has been applied. Whatever the resolver returns goes to the driver
   * untouched.
   *
   * `scope` is resolved from the caller's context *before* hooks ran, which is
   * what stops a hook returning `{ ...options, ctx: other }` from choosing
   * which principal is enforced. `options.ctx` stays exactly as hooks left it,
   * since that is what the driver will run under.
   */
  private async applyQueryScope<
    Options extends { where?: WhereClause; ctx?: PlainLiteralObject },
  >(
    operation: RowScopeQueryOperation,
    options: Options,
    scope: PlainLiteralObject | undefined,
  ): Promise<Options> {
    const rowScope = this.requireRowScope();
    if (!rowScope) return options;

    return rowScope.scopeQuery({ operation, options, ctx: options.ctx, scope });
  }

  /**
   * Resolve the row scope overlay from the caller's context.
   *
   * Read at the public entry point, before hooks run, so what a resolver
   * enforces against cannot be influenced by anything downstream. An absent
   * overlay yields `undefined` and leaves the resolver to fail closed.
   */
  private resolveRowScopeContext(
    ctx?: PlainLiteralObject,
  ): PlainLiteralObject | undefined {
    if (!ctx) return undefined;

    const appCtx = AppContextHost.from(ctx);
    return appCtx.supports(RowScopeCtx) ? appCtx.with(RowScopeCtx) : undefined;
  }

  /**
   * Invoke the bound scope resolver for a write, and hand the driver what it
   * returns. A resolver refuses by throwing.
   *
   * `target` is the existing row the call is aimed at, where there is one —
   * the pre-hook argument, not the post-hook payload.
   *
   * The row is pinned before this runs — see `withoutRelations` and, for
   * `update`/`replace`, `assertKeyUnchanged`.
   *
   * The delete/lifecycle operations act on the returned `value` rather than on
   * `target`, so that is the one to check. See `RowScopeWriteParams`.
   */
  private async applyWriteScope<Value extends PlainLiteralObject>(
    operation: RowScopeWriteOperation,
    value: Value,
    target: PlainLiteralObject | undefined,
    ctx: PlainLiteralObject | undefined,
  ): Promise<Value> {
    const rowScope = this.requireRowScope();
    if (!rowScope) return value;

    return rowScope.scopeWrite({
      operation,
      value,
      target,
      ctx,
      scope: this.resolveRowScopeContext(ctx),
    });
  }

  /**
   * Batch form: the callback is invoked once per element, and a refusal of any
   * one element rejects the whole call. All-or-nothing is the only safe
   * default — a partially applied batch would leave the caller unable to tell
   * which rows were written without re-reading them.
   */
  private async applyWriteScopeMany<Value extends PlainLiteralObject>(
    operation: RowScopeWriteOperation,
    values: Value[],
    targets: (PlainLiteralObject | undefined)[],
    ctx: PlainLiteralObject | undefined,
  ): Promise<Value[]> {
    if (!this.requireRowScope()) return values;

    const scoped: Value[] = [];
    for (const [index, value] of values.entries()) {
      scoped.push(
        await this.applyWriteScope(operation, value, targets[index], ctx),
      );
    }

    return scoped;
  }

  // Query operations

  async find(options: RepositoryFindOptions<Entity> = {}): Promise<Entity[]> {
    const scope = this.resolveRowScopeContext(options.ctx);

    return this.permeator.find.permeate(
      options,
      async (scoped) =>
        this.doFind(
          await this.applyQueryScope(RowScopeOperation.FIND, scoped, scope),
        ),
      this.entityCtx(options.ctx),
    );
  }

  protected abstract doFind(
    options?: RepositoryFindOptions<Entity>,
  ): Promise<Entity[]>;

  async findOne(
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Entity | null> {
    const scope = this.resolveRowScopeContext(options.ctx);

    return this.permeator.findOne.permeate(
      options,
      async (scoped) =>
        this.doFindOne(
          await this.applyQueryScope(RowScopeOperation.FIND_ONE, scoped, scope),
        ),
      this.entityCtx(options.ctx),
    );
  }

  protected abstract doFindOne(
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Entity | null>;

  async count(options: RepositoryFindOptions<Entity> = {}): Promise<number> {
    const scope = this.resolveRowScopeContext(options.ctx);

    return this.permeator.count.permeate(
      options,
      async (scoped) =>
        this.doCount(
          await this.applyQueryScope(RowScopeOperation.COUNT, scoped, scope),
        ),
      this.entityCtx(options.ctx),
    );
  }

  protected abstract doCount(
    options?: RepositoryFindOptions<Entity>,
  ): Promise<number>;

  /**
   * Find entities and return with total count.
   *
   * When a federation orchestrator is set and the query includes
   * joins targeting `federated: true` relations, delegates to the
   * orchestrator for cross-entity query orchestration.
   */
  async findAndCount(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<[Entity[], number]> {
    if (this._federationOrchestrator && this.hasFederatedJoins(options?.join)) {
      return this._federationOrchestrator.findAndCount(this, options);
    }

    const scope = this.resolveRowScopeContext(options.ctx);

    return this.permeator.findAndCount.permeate(
      options,
      async (scoped) =>
        this.doFindAndCount(
          await this.applyQueryScope(
            RowScopeOperation.FIND_AND_COUNT,
            scoped,
            scope,
          ),
        ),
      this.entityCtx(options.ctx),
    );
  }

  protected abstract doFindAndCount(
    options?: RepositoryFindOptions<Entity>,
  ): Promise<[Entity[], number]>;

  // Create operations

  async create(
    entity: DeepPartial<Entity>,
    options?: RepositoryCreateOptions,
  ): Promise<Entity> {
    return this.permeator.create.permeate(
      entity,
      async (scoped) => {
        const value = await this.applyWriteScope(
          RowScopeOperation.CREATE,
          scoped,
          undefined,
          options?.ctx,
        );
        this.assertKeyNotPartial(value);
        await this.assertNotExisting(value, options?.ctx);
        return this.doCreate(value, options);
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doCreate(
    entity: DeepPartial<Entity>,
    options?: RepositoryCreateOptions,
  ): Promise<Entity>;

  async createMany(
    entities: DeepPartial<Entity>[],
    options?: RepositoryCreateOptions,
  ): Promise<Entity[]> {
    return this.permeator.createMany.permeate(
      entities,
      async (scoped) => {
        const values = await this.applyWriteScopeMany(
          RowScopeOperation.CREATE_MANY,
          scoped,
          [],
          options?.ctx,
        );
        for (const value of values) {
          this.assertKeyNotPartial(value);
          await this.assertNotExisting(value, options?.ctx);
        }
        return this.doCreateMany(values, options);
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doCreateMany(
    entities: DeepPartial<Entity>[],
    options?: RepositoryCreateOptions,
  ): Promise<Entity[]>;

  // Update operations

  async update(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions<Entity>,
  ): Promise<Entity> {
    const versionGuard = this.resolveVersionGuard(entity, options, 'guard');
    this.assertMutable(entity, options);
    return this.permeator.update.permeate(
      data,
      async (scoped) => {
        // Before row scope: moving the write is a repository-level error
        // whatever the scope, and reporting it as such is clearer than the
        // scope refusal it would otherwise surface as. Still after hooks, so
        // a hook cannot redirect the write either.
        this.assertKeyUnchanged(entity, scoped);
        const stored = this.withoutRelations(entity);
        return this.doUpdate(
          stored,
          await this.applyWriteScope(
            RowScopeOperation.UPDATE,
            scoped,
            stored,
            options?.ctx,
          ),
          { ...options, versionGuard },
        );
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doUpdate(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions<Entity>,
  ): Promise<Entity>;

  async upsert(
    entity: DeepPartial<Entity>,
    options?: RepositoryUpsertOptions,
  ): Promise<Entity> {
    await this.assertUpsertMutable(entity, options);
    return this.permeator.upsert.permeate(
      entity,
      async (scoped) =>
        this.doUpsert(
          await this.applyWriteScope(
            RowScopeOperation.UPSERT,
            scoped,
            // Upsert names its row by the key in its own payload, so the row
            // it aims at has to be looked up rather than passed in. Absent
            // means the conflict clause cannot fire, which is the difference
            // between an insert and an update a resolver has to police.
            await this.findByKey(scoped, options?.ctx),
            options?.ctx,
          ),
          options,
        ),
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doUpsert(
    entity: DeepPartial<Entity>,
    options?: RepositoryUpsertOptions,
  ): Promise<Entity>;

  async replace(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions<Entity>,
  ): Promise<Entity> {
    const versionGuard = this.resolveVersionGuard(entity, options, 'guard');
    this.assertMutable(entity, options);
    return this.permeator.replace.permeate(
      data,
      async (scoped) => {
        this.assertKeyUnchanged(entity, scoped);
        const stored = this.withoutRelations(entity);
        return this.doReplace(
          stored,
          await this.applyWriteScope(
            RowScopeOperation.REPLACE,
            scoped,
            stored,
            options?.ctx,
          ),
          { ...options, versionGuard },
        );
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doReplace(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions<Entity>,
  ): Promise<Entity>;

  // Delete operations

  async delete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions<Entity>,
  ): Promise<Entity> {
    const versionGuard = this.resolveVersionGuard(entity, options, 'skip');
    return this.permeator.delete.permeate(
      entity,
      async (scoped) => {
        const stored = this.withoutRelations(scoped);
        return this.doDelete(
          await this.applyWriteScope(
            RowScopeOperation.DELETE,
            stored,
            stored,
            options?.ctx,
          ),
          { ...options, versionGuard },
        );
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doDelete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions<Entity>,
  ): Promise<Entity>;

  async deleteMany(
    entities: Entity[],
    options?: RepositoryDeleteOptions,
  ): Promise<Entity[]> {
    return this.permeator.deleteMany.permeate(
      entities,
      async (scoped) => {
        const stored = scoped.map((entity) => this.withoutRelations(entity));
        return this.doDeleteMany(
          await this.applyWriteScopeMany(
            RowScopeOperation.DELETE_MANY,
            stored,
            stored,
            options?.ctx,
          ),
          options,
        );
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doDeleteMany(
    entities: Entity[],
    options?: RepositoryDeleteOptions,
  ): Promise<Entity[]>;

  async softDelete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions<Entity>,
  ): Promise<Entity> {
    // Resolved (and, on a mismatch, thrown) ahead of the idempotent no-op
    // below, so a stale precondition against a row someone else already
    // deleted conflicts instead of quietly succeeding.
    const versionGuard = this.resolveVersionGuard(entity, options, 'skip');

    const deleteDateColumn = this.getDeleteDateColumn();
    if (deleteDateColumn && this.isSoftDeleted(entity, deleteDateColumn)) {
      // The no-op below returns without reaching the permeator, so scope is
      // consulted here or not at all — and "already deleted" must not become a
      // way to soft-delete a row the caller was never allowed to touch. The
      // returned value is discarded rather than returned: nothing is written,
      // so only the resolver's refusal is meaningful.
      const stored = this.withoutRelations(entity);
      await this.applyWriteScope(
        RowScopeOperation.SOFT_DELETE,
        stored,
        stored,
        options?.ctx,
      );

      // Same reasoning for hooks: this path skips the permeator, so a
      // declaration that could never run would go unrefused here alone.
      this.assertHooksRunnable();

      // Idempotent rather than rejected: a retried delete must not fail.
      return entity;
    }

    return this.permeator.softDelete.permeate(
      entity,
      async (scoped) => {
        const stored = this.withoutRelations(scoped);
        return this.doSoftDelete(
          await this.applyWriteScope(
            RowScopeOperation.SOFT_DELETE,
            stored,
            stored,
            options?.ctx,
          ),
          { ...options, versionGuard },
        );
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doSoftDelete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions<Entity>,
  ): Promise<Entity>;

  async restore(
    entity: Entity,
    options?: RepositoryRestoreOptions<Entity>,
  ): Promise<Entity> {
    const versionGuard = this.resolveVersionGuard(entity, options, 'skip');
    return this.permeator.restore.permeate(
      entity,
      async (scoped) => {
        const stored = this.withoutRelations(scoped);
        return this.doRestore(
          await this.applyWriteScope(
            RowScopeOperation.RESTORE,
            stored,
            stored,
            options?.ctx,
          ),
          { ...options, versionGuard },
        );
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doRestore(
    entity: Entity,
    options?: RepositoryRestoreOptions<Entity>,
  ): Promise<Entity>;

  // Utility methods

  abstract transform(entityLike: DeepPartial<Entity>): Entity;

  abstract merge(
    mergeIntoEntity: Entity,
    ...entityLikes: DeepPartial<Entity>[]
  ): Entity;

  /**
   * Prepare a DTO for write operations.
   * Transforms DTO to entity instance if needed. An empty object is a
   * valid entity (e.g. every column is server-populated) — rejecting it
   * is a schema/validation-layer decision, not this adapter's (see #466).
   */
  prepare(dto: DeepPartial<Entity>): Entity | undefined {
    if (!isObject(dto)) {
      return undefined;
    }

    const entityType = this.metadata.type;

    if (dto instanceof entityType) {
      return dto;
    }

    return Object.assign(new entityType(), dto);
  }

  /**
   * Get primary key column names from metadata
   */
  protected getPrimaryColumns(): (keyof Entity & string)[] {
    return this.metadata.columns
      .filter((col) => col.isPrimary)
      .map((col) => col.name);
  }

  /**
   * Get the optimistic-locking version column name from metadata, if any.
   */
  protected getVersionColumn(): (keyof Entity & string) | undefined {
    return this.metadata.columns.find((col) => col.isVersion)?.name;
  }

  /**
   * Get the soft-remove date column name from metadata, if any.
   */
  protected getDeleteDateColumn(): (keyof Entity & string) | undefined {
    return this.metadata.columns.find((col) => col.isRemoveDate)?.name;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Soft-deleted immutability
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * A soft-deleted row is immutable everywhere except through `restore()`.
   * Enforced here — once, for every driver — rather than per-implementation,
   * so no driver can forget or diverge from the invariant. See #471.
   */
  private isSoftDeleted(
    entity: PlainLiteralObject,
    deleteDateColumn: keyof Entity & string,
  ): boolean {
    return entity[deleteDateColumn] != null;
  }

  /**
   * Throw `SoftDeletedImmutableException` if `entity` is currently
   * soft-deleted, unless the caller opted out via `{ force: true }`.
   */
  private assertMutable(entity: Entity, options?: { force?: boolean }): void {
    if (options?.force) return;

    const deleteDateColumn = this.getDeleteDateColumn();
    if (!deleteDateColumn) return;

    if (this.isSoftDeleted(entity, deleteDateColumn)) {
      throw new SoftDeletedImmutableException(this.metadata.name);
    }
  }

  /**
   * Same guard as `assertMutable`, but for `upsert()` — the caller only
   * supplies a partial entity, not an existing row, so whether the target is
   * soft-deleted has to be read first. `prepare()` materializes a typed
   * `Entity` so the primary key columns can be read without a cast. Uses
   * `withDeleted: true` since the row being checked is expected to be
   * soft-deleted.
   *
   * Reads via the protected `doFindOne` rather than the public `findOne`, so
   * the find permeator is bypassed and a `beforeFindOne` hook cannot decide
   * this guard — but row scope is applied explicitly, because it must. An
   * unscoped read here would answer "is there a soft-deleted row with this
   * key" across every scope at once, letting the immutability exception
   * report the existence of a row the caller cannot see.
   *
   * Nothing is lost by bypassing the permeator: the scope this read enforces
   * comes from the context overlay, not from anything hooks produce.
   */
  private async assertUpsertMutable(
    entity: DeepPartial<Entity>,
    options?: { force?: boolean; ctx?: PlainLiteralObject },
  ): Promise<void> {
    if (options?.force) return;

    const deleteDateColumn = this.getDeleteDateColumn();
    if (!deleteDateColumn) return;

    const primaryColumns = this.getPrimaryColumns();
    if (primaryColumns.length === 0) return;

    const prepared = this.prepare(entity);
    if (!prepared) return;

    const conditions: WhereClause[] = [];
    for (const col of primaryColumns) {
      const value = prepared[col];
      // No primary key supplied — this is a fresh insert, not a write
      // against an existing (possibly soft-deleted) row.
      if (value === undefined) return;
      conditions.push(Where.eq(col, value));
    }

    const where =
      conditions.length === 1 ? conditions[0] : Where.and(...conditions);

    const existing = await this.doFindOne(
      await this.applyQueryScope(
        RowScopeOperation.FIND_ONE,
        { where, withDeleted: true, ctx: options?.ctx },
        this.resolveRowScopeContext(options?.ctx),
      ),
    );

    if (existing && this.isSoftDeleted(existing, deleteDateColumn)) {
      throw new SoftDeletedImmutableException(this.metadata.name);
    }
  }

  /**
   * Enforce that a create inserts rather than updates.
   *
   * A driver is free to implement create with a save-by-primary-key primitive,
   * which would silently overwrite the row a supplied key names. That is
   * invisible to every permission check above this layer, because on the way in
   * it looks like an insert — so the guard lives here, once, rather than in
   * each driver.
   *
   * Reads via the protected `doFindOne` so it bypasses both the hook permeator
   * and row scope. Bypassing scope is the point: the question is whether the
   * key is taken, not whether the caller may see the row that took it. The
   * alternative — a scoped read — cannot tell "does not exist yet" from
   * "belongs to another scope", and guessing wrong either refuses every
   * caller-supplied key or permits a cross-scope overwrite.
   *
   * A key is only checkable when every primary column is present; a partial one
   * cannot identify a row, so it is left to the database. `withDeleted` because
   * a soft-deleted row still occupies its primary key.
   *
   * **This is a check-then-write with a real race**, unreachable for generated
   * keys and narrow for caller-supplied ones. See "Create Inserts, It Never
   * Updates" in the README.
   */
  private async assertNotExisting(
    entity: DeepPartial<Entity>,
    ctx?: PlainLiteralObject,
  ): Promise<void> {
    const where = this.keyClause(entity);
    if (!where) return;

    const existing = await this.doFindOne({ where, withDeleted: true, ctx });

    if (existing) {
      throw new EntityAlreadyExistsException(this.metadata.name);
    }
  }

  /**
   * An equality clause on every primary key column, or `undefined` when the
   * key is incomplete — nothing to identify a row with.
   *
   * Read off `transform` rather than the raw value: it settles a relation
   * object into the scalar column it backs, and does not fill database
   * defaults, so a partial key stays partial.
   */
  /**
   * Refuse a create that supplies only part of a composite primary key.
   *
   * A partial key cannot be looked up, so `assertNotExisting` cannot tell
   * whether it is taken, and the driver then fails with a message about
   * updating a row — for a call to `create`, naming no column. Refusing here
   * reports which columns are missing.
   *
   * Supplying none of them is the ordinary generated-key create and is left
   * alone, as is a single-column key.
   */
  private assertKeyNotPartial(entity: DeepPartial<Entity>): void {
    const primaryColumns = this.getPrimaryColumns();
    if (primaryColumns.length < 2) return;

    if (!isObject(entity)) return;

    const prepared = this.transform(entity);
    const missing = primaryColumns.filter((col) => prepared[col] === undefined);

    if (missing.length === 0 || missing.length === primaryColumns.length) {
      return;
    }

    throw new PartialPrimaryKeyException(this.metadata.name, missing);
  }

  private keyClause(entity: DeepPartial<Entity>): WhereClause | undefined {
    const primaryColumns = this.getPrimaryColumns();
    if (primaryColumns.length === 0) return undefined;

    if (!isObject(entity)) return undefined;

    const prepared = this.transform(entity);

    const conditions: WhereClause[] = [];
    for (const col of primaryColumns) {
      const value = prepared[col];
      if (value === undefined) return undefined;
      conditions.push(Where.eq(col, value));
    }

    return conditions.length === 1 ? conditions[0] : Where.and(...conditions);
  }

  /**
   * The stored row a write names, found by primary key alone.
   *
   * Deliberately unscoped — a resolver's own reads carry its scope predicate
   * and so cannot tell "no such row" from "not yours". Handed over as `target`
   * for the resolver to check, never as something to trust. Only read when a
   * resolver is bound, so an unscoped repository pays nothing.
   */
  private async findByKey(
    entity: DeepPartial<Entity>,
    ctx?: PlainLiteralObject,
  ): Promise<Entity | undefined> {
    if (!this.requireRowScope()) return undefined;

    const where = this.keyClause(entity);
    if (!where) return undefined;

    return (
      (await this.doFindOne({ where, withDeleted: true, ctx })) ?? undefined
    );
  }

  /**
   * `entity` with its relation properties removed, for any write that names an
   * existing row.
   *
   * A driver resolving a column prefers a relation object over the column's
   * own scalar — so a relation on the caller's entity decides which row is
   * written, whatever the scalar says. Planting one redirects the write to a
   * row the caller never named, invisibly to every check above the repository.
   *
   * It also lets two checks disagree: a resolver reads the key through
   * `transform` (relation-first) while a driver's identifying read may take the
   * scalar, so the pre-check clears one row and the statement hits another.
   *
   * Removing them leaves the scalars to decide, which is what the rest of the
   * write path already reads. On `update`/`replace` this is the merge base, so
   * `data`'s own relations are applied afterwards and are unaffected; a
   * relation absent from a merge base means "unchanged" to a driver, not
   * "cleared".
   */
  private withoutRelations(entity: Entity): Entity {
    const relations = this.metadata.relations;
    if (!relations?.length) return entity;

    const stripped = { ...entity };
    for (const relation of relations) {
      delete stripped[relation.name];
    }

    return this.prepare(stripped) ?? entity;
  }

  /**
   * Refuse an `update` or `replace` whose data would change the primary key.
   *
   * Both name the row to write in their entity argument; `data` carries field
   * values, not a target. A primary key arriving through `data` decides the row
   * instead — the write lands on a row the caller never named, and the row they
   * passed is left untouched. Nothing above the repository can see that happen,
   * because on the way in it looks like an ordinary update of the entity.
   *
   * Compares after a merge rather than reading `data` directly: a column can be
   * supplied as its own scalar or through a relation object that resolves to
   * it, and merging settles both into the scalar column a driver will write.
   * The merge runs against a copy, so the caller's entity is not touched.
   *
   * `upsert` is deliberately not guarded — its key comes from the payload by
   * contract, and it has no entity argument to contradict.
   */
  private assertKeyUnchanged(entity: Entity, data: DeepPartial<Entity>): void {
    const primaryColumns = this.getPrimaryColumns();
    if (primaryColumns.length === 0) return;

    const base = this.prepare({ ...entity });
    if (!base) return;

    const probe = this.merge(base, data);

    const changed = primaryColumns.filter(
      (column) => probe[column] !== entity[column],
    );

    if (changed.length > 0) {
      throw new PrimaryKeyImmutableException(this.metadata.name, changed);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Expected version (cross-request optimistic locking)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Throw `OptimisticLockException` if `entity`'s current version doesn't
   * match `expectedVersion` — the version the caller last read. Closes the
   * gap the in-request compare-and-swap can't: two requests that each
   * re-read before writing both pass it, since each compares against its
   * own fresh value. See #472.
   */
  private assertExpectedVersion(
    entity: Entity,
    options?: { expectedVersion?: number },
  ): void {
    const { expectedVersion } = options ?? {};
    if (expectedVersion === undefined) return;

    const versionColumn = this.getVersionColumn();

    if (!versionColumn) {
      throw new RuntimeException({
        message:
          'Cannot enforce an expected version on "%s": the entity has no ' +
          'version column',
        messageParams: [this.metadata.name],
        fault: 'usage',
      });
    }

    // Numeric compare: a bigint version column hydrates as a string.
    if (Number(entity[versionColumn]) !== expectedVersion) {
      throw new OptimisticLockException(this.metadata.name);
    }
  }

  /**
   * Resolve the descriptor a driver needs to compare-and-swap on the
   * version column — the driver executes it, it never decides whether one
   * applies. `update`/`replace` pass `'guard'`: a versioned entity is
   * guarded there whether or not the caller stated a version, matching the
   * in-request behavior shipped with #469. The delete paths pass `'skip'`,
   * so they only take on a driver-side transaction requirement for callers
   * who actually asked for one.
   */
  private resolveVersionGuard(
    entity: Entity,
    options: { expectedVersion?: number } | undefined,
    whenUnspecified: 'guard' | 'skip',
  ): RepositoryVersionGuardInterface<Entity> | undefined {
    this.assertExpectedVersion(entity, options);

    const column = this.getVersionColumn();
    if (!column) return undefined;

    if (options?.expectedVersion === undefined && whenUnspecified === 'skip') {
      return undefined;
    }

    // Safe uniformly: assertExpectedVersion has already proved this equals
    // expectedVersion whenever the caller supplied one.
    return { column, value: entity[column] };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Federation helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if any requested joins target federated relations.
   */
  private hasFederatedJoins(join?: JoinClause[]): boolean {
    if (!join?.length || !this.metadata.relations?.length) return false;
    const joinNames = new Set(join.map((j) => j.relation));
    return this.metadata.relations.some(
      (r) => r.federated && joinNames.has(r.name),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JoinClause resolution (ORM-agnostic)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Validate JoinClauses against repository relation metadata.
   *
   * Called by ORM adapters before translating to native find options.
   */
  protected resolveJoinClauses(join?: JoinClause[]): JoinClause[] | undefined {
    if (!join?.length) return undefined;

    const relMap = new Map(this.metadata.relations?.map((r) => [r.name, r]));

    for (const j of join) {
      if (!relMap.has(j.relation)) {
        throw new RuntimeException({
          message: 'Unknown relation "%s" on entity "%s"',
          messageParams: [j.relation, this.metadata.name],
          httpStatus: HttpStatus.BAD_REQUEST,
          fault: 'client',
        });
      }
    }

    return join;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WhereClause AST helpers (ORM-agnostic)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Flatten a WhereClause tree into Disjunctive Normal Form:
   * an array of AND-branches, where each branch is a flat list
   * of WhereClause leaves. The outer array represents OR.
   *
   * Leaves are either WhereConditions or not(...) compounds
   * preserved for ORM-specific translation.
   *
   * `[]` is never returned — it would be ambiguous between "no constraint"
   * and "nothing matches," and a where-clause compiler resolving that
   * ambiguity fail-open is exactly how an unsatisfiable scope (an empty
   * `AND`/`OR`, or `Where.never()` itself) can silently evaporate into
   * "match everything." `[[NEVER]]` — a single branch containing exactly
   * one `WhereNever` leaf — is the sole encoding of FALSE; every other
   * result represents at least one satisfiable branch. Every case below is
   * responsible for preserving that invariant, not just the leaves.
   */
  protected toDnf(clause: WhereClause): WhereClause[][] {
    if (isWhereNever(clause)) {
      return [[clause]];
    }

    if (isWhereCondition(clause)) {
      return [[clause]];
    }

    if (!isWhereCompound(clause)) {
      throw new RuntimeException({
        message: 'Unrecognized where clause node',
        fault: 'internal',
      });
    }

    // Switch on a local, not clause.operator directly — otherwise TS
    // narrows `clause` to `never` in `default:`, breaking the property read.
    const operator = clause.operator;
    switch (operator) {
      case WhereCompoundOperator.OR: {
        // OR's identity for zero conditions, and for every branch turning
        // out FALSE, is "none of them matched" — never "no constraint".
        if (clause.conditions.length === 0) return [[Where.never()]];
        const branches = clause.conditions
          .flatMap((c) => this.toDnf(c))
          .filter((branch) => !this.isNeverBranch(branch));
        return branches.length === 0 ? [[Where.never()]] : branches;
      }

      case WhereCompoundOperator.AND: {
        // Empty AND is a deliberate deviation from AND's logical identity
        // (true): this is a security-relevant AST, and unreachable through
        // the public builder API (`Where.and()` throws on empty args) — the
        // only way to construct one is a hand-built clause, where refusing
        // to match is the safe direction.
        if (clause.conditions.length === 0) return [[Where.never()]];
        const groups = clause.conditions.map((c) => this.toDnf(c));
        if (groups.some((g) => this.isNeverDnf(g))) return [[Where.never()]];
        if (groups.length === 1) return groups[0];
        return this.cartesianProduct(groups);
      }

      default:
        throw new RuntimeException({
          message: 'Unrecognized where compound operator "%s"',
          messageParams: [operator],
          fault: 'internal',
        });
    }
  }

  /**
   * A DNF branch is the canonical FALSE encoding iff it's the singleton
   * `[Where.never()]` — see `toDnf`'s invariant. A never leaf is never
   * merged into a longer branch (AND short-circuits to `[[NEVER]]` the
   * moment any sub-group is FALSE, before `cartesianProduct` ever runs).
   */
  private isNeverBranch(branch: WhereClause[]): boolean {
    return branch.length === 1 && isWhereNever(branch[0]);
  }

  private isNeverDnf(dnf: WhereClause[][]): boolean {
    return dnf.length === 1 && this.isNeverBranch(dnf[0]);
  }

  protected static readonly MAX_DNF_BRANCHES = 50;

  /**
   * Compute cartesian product of AND-groups of OR-branches.
   * Distributes AND over OR at the AST level.
   *
   * e.g., `[[[a]], [[b], [c]]] => [[a, b], [a, c]]`
   */
  protected cartesianProduct(groups: WhereClause[][][]): WhereClause[][] {
    let result = groups[0];

    for (let i = 1; i < groups.length; i++) {
      const nextGroup = groups[i];
      const newResult: WhereClause[][] = [];
      for (const existing of result) {
        for (const next of nextGroup) {
          if (newResult.length >= RepositoryAdapter.MAX_DNF_BRANCHES) {
            throw new RuntimeException({
              message: 'Where clause too complex: exceeded %d DNF branches',
              messageParams: [RepositoryAdapter.MAX_DNF_BRANCHES],
              httpStatus: HttpStatus.BAD_REQUEST,
              fault: 'client',
            });
          }
          newResult.push([...existing, ...next]);
        }
      }
      result = newResult;
    }

    return result;
  }

  /**
   * Run repository hooks for a specific method key.
   *
   * @param methodKey - The hook method key (e.g., 'beforeFind', 'afterCreate')
   * @param payload - The payload to pass through hooks
   * @param ctx - The hook context
   * @param filter - Optional predicate over each method's metadata (e.g.
   *   `RepoHookStrategy.merge`/`.replace`), letting a single method key be
   *   split into disjoint execution passes
   * @returns The payload after processing by applicable hooks
   */
  protected async runHooks<T>(
    methodKey: HookMethodKeyType,
    payload: T,
    ctx: PlainLiteralObject | undefined,
    filter?: HookMethodFilter,
  ): Promise<T> {
    this.assertHooksRunnable();

    if (!this.hookResolver) {
      return payload;
    }

    return this.hookResolver.execute(
      RepoHook,
      methodKey,
      payload,
      this.applicableHooks(ctx),
      ctx,
      filter,
    );
  }

  /**
   * The hooks that apply to this call: those registered for this entity, plus
   * any the context carries from a `@UseHooks()` route.
   *
   * Registered hooks come first and win the dedupe, because they hold whatever
   * guarantee the entity was registered for. A context-carried hook may have
   * been declared on a route for a different entity entirely and reached here
   * by a forwarded `ctx`, so a duplicate is reported against the route rather
   * than the registration.
   */
  private applicableHooks(ctx: PlainLiteralObject | undefined): HookWithSpec[] {
    const registered = this._hooks ?? [];
    const carried = this.contextHooks(ctx);
    if (!carried.length) return registered;

    const registeredClasses = new Set(registered.map((config) => config.hook));
    const seen = new Set(registeredClasses);
    const merged = [...registered];

    for (const config of carried) {
      if (seen.has(config.hook)) {
        this.warnDuplicateHook(config.hook, registeredClasses.has(config.hook));
        continue;
      }
      seen.add(config.hook);
      merged.push(config);
    }

    return merged;
  }

  /**
   * Read the route-declared hooks off the context, if the overlay is there.
   */
  private contextHooks(ctx: PlainLiteralObject | undefined): HookWithSpec[] {
    if (!ctx) return [];

    const appCtx = AppContextHost.from(ctx);
    if (!appCtx.supports(HooksCtx)) return [];

    return appCtx.with(HooksCtx).hooks ?? [];
  }

  /**
   * Warn once per hook class per entity. The dedupe already made it run once;
   * this is so the redundant registration gets removed rather than lived with.
   */
  private warnDuplicateHook(hook: Type, alsoRegistered: boolean): void {
    if (this._warnedDuplicates.has(hook)) return;
    this._warnedDuplicates.add(hook);

    const hookName = hook.name;

    process.emitWarning(
      alsoRegistered
        ? `Hook "${hookName}" is registered for "${this.entityKey}" and also ` +
            'arrived on the context from a @UseHooks() route. It runs once. ' +
            'If that route exists only to reach this entity the @UseHooks() ' +
            'entry is redundant — but it may be covering other entities too.'
        : `Hook "${hookName}" reached "${this.entityKey}" twice on the same ` +
            'context. It runs once. Remove the duplicate @UseHooks() entry.',
      { code: 'ROCKETS_HOOKS_DUPLICATE' },
    );
  }
}
