import { HttpStatus, type PlainLiteralObject, type Type } from '@nestjs/common';

import {
  AppContextHost,
  type DeepPartial,
  isObject,
  RuntimeException,
  type HookMethodFilter,
  type HookMethodKeyType,
  type HookResolverService,
  type HookWithSpec,
  HooksCtx,
  normalizeHookOption,
} from '@concepta/nestjs-core';

import {
  type CascadeRelation,
  CascadeWriter,
} from '../cascade/cascade-writer.js';
import { RepoCtx } from '../context/interfaces/repository-context.interface.js';
import { EntityAlreadyExistsException } from '../exceptions/entity-already-exists.exception.js';
import { HookBootException } from '../exceptions/hook-boot.exception.js';
import { InvalidColumnValueException } from '../exceptions/invalid-column-value.exception.js';
import { OptimisticLockException } from '../exceptions/optimistic-lock.exception.js';
import { PartialPrimaryKeyException } from '../exceptions/partial-primary-key.exception.js';
import { PrimaryKeyImmutableException } from '../exceptions/primary-key-immutable.exception.js';
import { RelationWriteException } from '../exceptions/relation-write.exception.js';
import { RepositoryBootException } from '../exceptions/repository-boot.exception.js';
import { RepositoryQueryException } from '../exceptions/repository-query.exception.js';
import { RepositoryUnboundException } from '../exceptions/repository-unbound.exception.js';
import { SoftDeletedImmutableException } from '../exceptions/soft-deleted-immutable.exception.js';
import { UnknownColumnException } from '../exceptions/unknown-column.exception.js';
import { FederationException } from '../federation/exceptions/federation.exception.js';
import { splitFederatedWhere } from '../federation/federated-where.js';
import {
  type FederatedRelation,
  type FederationRoot,
} from '../federation/federation-reader.service.js';
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
import { AppendOnlyViolationException } from '../write-policy/exceptions/append-only-violation.exception.js';
import {
  isAppendOnly,
  type WritePolicyRegistration,
} from '../write-policy/interfaces/write-policy-registration.interface.js';

import { type JoinClause } from './interfaces/join-clause.interface.js';
import { type RepositoryBindingInterface } from './interfaces/repository-binding.interface.js';
import { type RepositoryDatabaseErrorInterface } from './interfaces/repository-database-error.interface.js';
import { type RepositoryMetadataInterface } from './interfaces/repository-metadata.interface.js';
import {
  type RepositoryFindOptions,
  type RepositoryFindOneOptions,
  type RepositoryCountOptions,
  type RepositoryCreateOptions,
  type RepositoryUpdateOptions,
  type RepositoryUpsertOptions,
  type RepositoryDeleteOptions,
  type RepositoryDeleteOneOptions,
  type RepositoryRestoreOptions,
  type RepositoryVersionGuardOptions,
} from './interfaces/repository-options.interface.js';
import { type RepositoryVersionGuardInterface } from './interfaces/repository-version-guard.interface.js';
import { type RepositoryInterface } from './interfaces/repository.interface.js';
import {
  type WhereClause,
  type WhereCondition,
  isWhereCondition,
  isWhereCompound,
  isWhereNever,
} from './interfaces/where-clause.interface.js';
import { SortOrder, WhereCompoundOperator } from './repository.types.js';
import { Where } from './where.helpers.js';

/** The `ctx` a read arrived with, and the row scope resolved from it. */
interface FederatedCaller {
  readonly ctx?: PlainLiteralObject;
  readonly scope?: PlainLiteralObject;
}

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
 *     return this.client.select(translate(options));
 *   }
 *
 *   protected async doCreate(entity: DeepPartial<Entity>) {
 *     return this.client.insert(entity);
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
  private _binding?: RepositoryBindingInterface;
  private _hooks: HookWithSpec[] = [];
  private _rowScope?: RowScopeInterface;
  private _cascade?: CascadeWriter;
  private readonly _warnedDuplicates = new Set<Type>();

  constructor(
    entityKey: string,
    protected readonly hookResolver?: HookResolverService,
  ) {
    this.entityKey = entityKey;

    if (!hookResolver && !warnedHooksNotWired) {
      warnedHooksNotWired = true;
      process.emitWarning(
        `Repository "${entityKey}" was constructed without a HookResolverService — ` +
          'route hooks (@UseHooks) will not run for this repository, or any ' +
          'other, until CoreModule is imported, and hooks registered on an ' +
          'entity fail startup. Import CoreModule (e.g. CoreModule.forRoot()).',
        { code: 'ROCKETS_HOOKS_NOT_WIRED' },
      );
    }
  }

  /**
   * Bind this entity's declarations: its row scope, hooks, write policy and
   * eager opt-in, as its `RepositoryModule.forRoot()` entry declares them.
   *
   * Called by `RepositoryModule.forRoot()`, never by a driver, so no driver
   * can drop a declaration. Binds once: enforcement that can be swapped at
   * runtime is not enforcement. Until it runs, the repository refuses every
   * operation.
   */
  bind(binding: RepositoryBindingInterface): void {
    if (this._binding) {
      throw new RepositoryBootException([
        `"${this.entityKey}" is already bound. A repository is bound once, ` +
          'at startup, and cannot be rebound.',
      ]);
    }

    const hooks = (binding.hooks ?? []).map(normalizeHookOption);

    // Refused rather than deduplicated: listing a class twice for one entity
    // has no reading that differs from listing it once, so it is a typo, and
    // running it twice would be silent — a doubled stamp looks identical.
    const duplicate = hooks.find(
      (config, i) => hooks.findIndex((c) => c.hook === config.hook) !== i,
    );
    if (duplicate) {
      throw new HookBootException([
        `Hook "${duplicate.hook.name}" is registered more than once for ` +
          `"${this.entityKey}". Remove the duplicate.`,
      ]);
    }

    if (hooks.length && !this.hookResolver) {
      throw new HookBootException([
        `"${this.entityKey}" declares hooks but no HookResolverService is ` +
          'available to run them. Import CoreModule (e.g. ' +
          'CoreModule.forRoot()).',
      ]);
    }

    this._hooks = hooks;
    this._binding = binding;
  }

  /**
   * Attach the row scope resolver instance, after `bind()` declared the
   * entity scoped.
   *
   * Separate from `bind()` because the instance comes from DI, through a
   * provider of its own. Until it is attached, the entity refuses every
   * operation rather than run unscoped. Attaches once.
   *
   * Refuses an entity without a primary key or without one of the resolver's
   * `scopeColumns` — checked per entity, since one resolver may serve many.
   */
  setRowScopeResolver(rowScope: RowScopeInterface): void {
    const binding = this._binding;
    if (!isRowScopeScoped(binding?.rowScope)) {
      throw new RowScopeBootException([
        `"${this.entityKey}" is not bound as scoped, so it takes no row ` +
          'scope resolver.',
      ]);
    }
    if (this._rowScope) {
      throw new RowScopeBootException([
        `"${this.entityKey}" already has a row scope resolver bound. ` +
          'Resolvers are bound once, at startup, and cannot be replaced.',
      ]);
    }

    const resolver = binding.rowScope.resolver.name;
    const columns = new Set(this.metadata.columns.map(({ name }) => name));
    const failures = [
      ...(this.metadata.columns.some(({ isPrimary }) => isPrimary)
        ? []
        : [
            `"${this.entityKey}" has a row scope but no primary key column, ` +
              'so a write cannot be checked against the one row it names.',
          ]),
      ...(rowScope.scopeColumns ?? [])
        .map(({ column }) => column)
        .filter((column) => !columns.has(column))
        .map(
          (column) =>
            `${resolver} scopes by "${column}", which is not a column of ` +
            `"${this.entityKey}". Add it to the entity, or give ` +
            `"${this.entityKey}" a resolver of its own.`,
        ),
    ];
    if (failures.length > 0) {
      throw new RowScopeBootException(failures);
    }

    this._rowScope = rowScope;
  }

  /**
   * Whether a resolver is attached. Read by the startup check that every
   * scoped entity got one.
   */
  get hasRowScopeResolver(): boolean {
    return this._rowScope !== undefined;
  }

  /**
   * The bound row scope declaration, or `undefined` if the entity declared
   * none. Read by the boot checks.
   */
  get rowScopeDeclaration(): RowScopeRegistration | undefined {
    return this._binding?.rowScope;
  }

  /**
   * The bound write policy, or `undefined` if the entity declared none. Read
   * by the guard and the boot checks.
   */
  get writePolicyDeclaration(): WritePolicyRegistration | undefined {
    return this._binding?.writePolicy;
  }

  /**
   * Whether a result may hold declared relations nobody joined, loaded by the
   * driver on its own. Drivers read this to decide whether to load them.
   */
  get allowsEagerRelations(): boolean {
    return this._binding?.allowEagerRelations ?? false;
  }

  /**
   * The relations whose rows, or whose junction rows, have a row scope, each
   * with the repository of its rows when those are the scoped ones. Read by
   * the join refusal and the boot checks.
   */
  get relationsIntoScoped(): ReadonlyMap<
    string,
    RepositoryAdapter<PlainLiteralObject> | undefined
  > {
    return this._binding?.relationsIntoScoped ?? new Map();
  }

  /**
   * The relations read through their own repositories instead of a join, by
   * name.
   */
  get federatedRelations(): ReadonlyMap<string, FederatedRelation> {
    return this._binding?.federation?.relations ?? new Map();
  }

  /**
   * The relations whose rows are written with this entity, through their own
   * repositories, by name.
   */
  get cascadeRelations(): ReadonlyMap<string, CascadeRelation> {
    return this._binding?.cascade ?? new Map();
  }

  private get cascade(): CascadeWriter {
    this._cascade ??= new CascadeWriter(
      this.metadata.name,
      this.cascadeRelations,
    );
    return this._cascade;
  }

  /**
   * The bound hooks, for the boot checks to validate.
   */
  get boundHooks(): readonly HookWithSpec[] {
    return this._hooks;
  }

  /**
   * The binding, refusing every operation until `bind()` has run. Called first
   * by every public operation, so a repository built outside
   * `RepositoryModule.forRoot()` cannot run without its declarations.
   */
  protected requireBinding(): RepositoryBindingInterface {
    if (!this._binding) {
      throw new RepositoryUnboundException(this.entityKey);
    }
    return this._binding;
  }

  /**
   * A join of `name` whose rows are scoped on the same terms as this entity's:
   * both resolvers are `joinable`, and each of the target's scope columns is
   * one of this entity's, read from the same key. Returns the target's scope
   * columns the join does not match to themselves, and the columns it does
   * join on. `undefined` for any other relation — including a many-to-many.
   */
  private sharedScopeJoin(
    name: string,
  ): { missing: string[]; columns: string[] } | undefined {
    const relation = this.metadata.relations?.find(
      (each) => each.name === name,
    );
    const own = this._rowScope;
    const theirs = this.relationsIntoScoped.get(name)?._rowScope;
    const theirColumns = theirs?.scopeColumns ?? [];

    if (
      !relation ||
      relation.through ||
      !own?.joinable ||
      !theirs?.joinable ||
      theirColumns.length === 0 ||
      !theirColumns.every((their) =>
        own.scopeColumns?.some(
          ({ column, key }) => column === their.column && key === their.key,
        ),
      )
    ) {
      return undefined;
    }

    const pairs = relation.joinOn ?? [relation.on];
    return {
      missing: theirColumns
        .map(({ column }) => column)
        .filter(
          (column) =>
            !pairs.some(({ from, to }) => from === column && to === column),
        ),
      columns: pairs.map(({ from }) => from),
    };
  }

  /**
   * Resolve the attached resolver, refusing to serve a scoped entity whose
   * resolver never arrived — one depending on a request-scoped provider, or
   * used before startup finished — rather than run it unscoped.
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
        (error) => this.describeDatabaseError(error),
      );
    }
    return this._permeator;
  }

  /**
   * What the driver can report about `error` when its database raised it, or
   * `undefined` otherwise. A reported error reaches the caller as a
   * `RepositoryDatabaseException`; any other opaque error as a
   * `RepositoryQueryException`.
   */
  protected describeDatabaseError(
    _error: unknown,
  ): RepositoryDatabaseErrorInterface | undefined {
    return undefined;
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
   *
   * What it returns is then checked by `assertReadable`, so a resolver cannot
   * name anything a caller could not.
   */
  private async applyQueryScope<
    Options extends RepositoryFindOneOptions<Entity>,
  >(
    operation: RowScopeQueryOperation,
    options: Options,
    scope: PlainLiteralObject | undefined,
  ): Promise<Options> {
    const rowScope = this.requireRowScope();
    const scoped = rowScope
      ? await rowScope.scopeQuery({
          operation,
          options,
          ctx: options.ctx,
          scope,
        })
      : options;

    this.assertReadable(scoped, operation);

    return scoped;
  }

  /**
   * Refuse a read that names anything but this entity's own columns and the
   * relations it joins — the read-side counterpart of `toOwnColumns`.
   *
   * - A field selected, filtered or sorted on must be one of the entity's own
   *   columns. A relation is not a column: a driver may read one as a join or
   *   a count over the related table, which the related entity's row scope
   *   never sees.
   * - A relation joined, or tagged on a filter or sort, must be declared.
   * - A relation whose rows have a row scope cannot be joined: the joined
   *   rows would come back unscoped. Unless both resolvers are joinable on
   *   the same scope columns and the join matches each — see
   *   `sharedScopeJoin`.
   * - A relation tagged on a filter or sort must also be joined, so a read
   *   only ever reaches the relations it names in `join`, and its field must
   *   be one of that relation's own columns.
   * - A sort direction is ascending or descending.
   * - A filter stays within the complexity every driver can translate.
   */
  private assertReadable(
    options: RepositoryFindOneOptions<Entity>,
    operation: RowScopeQueryOperation,
  ): void {
    const relations = new Set(
      (this.metadata.relations ?? []).map((relation) => relation.name),
    );
    const columns = new Set(this.metadata.columns.map((column) => column.name));

    const leaves = options.where ? this.whereConditions(options.where) : [];
    const order = options.order ?? [];

    const fields = [
      ...(options.select ?? []).map(String),
      ...leaves.filter((leaf) => !leaf.relation).map((leaf) => leaf.field),
      ...order.filter((key) => !key.relation).map((key) => key.field),
    ];
    const unknown = [...new Set(fields)].filter((field) => !columns.has(field));
    if (unknown.length > 0) {
      throw new UnknownColumnException(this.metadata.name, unknown, {
        message:
          'Cannot read %s — not a column of this entity: %s. Select, filter ' +
          'and sort on its own columns, and on a relation through join',
        messageParams: [this.metadata.name, unknown.join(', ')],
      });
    }

    const joined = (options.join ?? []).map((join) => join.relation);
    const tagged = [
      ...leaves.map((leaf) => leaf.relation),
      ...order.map((key) => key.relation),
    ].filter((relation) => relation !== undefined);

    const undeclared = [...joined, ...tagged].find(
      (relation) => !relations.has(relation),
    );
    if (undeclared !== undefined) {
      throw new RuntimeException({
        message: 'Unknown relation "%s" on entity "%s"',
        messageParams: [undeclared, this.metadata.name],
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      });
    }

    // A federated relation is read through the related entity's own
    // repository, under its row scope, so joining it bypasses nothing. Nor
    // does a join between rows scoped on the same terms.
    const intoScoped = joined.find(
      (relation) =>
        this.relationsIntoScoped.has(relation) &&
        !this.federatedRelations.has(relation) &&
        this.sharedScopeJoin(relation)?.missing.length !== 0,
    );
    const shared =
      intoScoped === undefined ? undefined : this.sharedScopeJoin(intoScoped);
    if (intoScoped !== undefined && shared !== undefined) {
      throw new RuntimeException({
        message:
          'Cannot join "%s" of %s: the rows it reads are scoped on the same ' +
          'terms, but the join leaves out %s, so it could reach rows outside ' +
          'that scope. Make the relation join on (%s).',
        messageParams: [
          intoScoped,
          this.metadata.name,
          shared.missing.join(', '),
          [...new Set([...shared.missing, ...shared.columns])].join(', '),
        ],
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      });
    }
    if (intoScoped !== undefined) {
      throw new RuntimeException({
        message:
          'Cannot join "%s" of %s: the rows it reads have a row scope, which ' +
          'a join would bypass. Read them through their own repository.',
        messageParams: [intoScoped, this.metadata.name],
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      });
    }

    const unjoined = tagged.find((relation) => !joined.includes(relation));
    if (unjoined !== undefined) {
      throw new RuntimeException({
        message:
          'Cannot filter or sort on relation "%s" of %s without joining it. ' +
          'Add it to join.',
        messageParams: [unjoined, this.metadata.name],
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      });
    }

    for (const relation of this.metadata.relations ?? []) {
      const targetColumns = new Set(
        relation.targetColumns.map((column) => column.name),
      );
      const unknownRelated = [
        ...new Set(
          [...leaves, ...order]
            .filter((key) => key.relation === relation.name)
            .map((key) => key.field)
            .filter((field) => !targetColumns.has(field)),
        ),
      ];
      if (unknownRelated.length > 0) {
        throw new UnknownColumnException(this.metadata.name, unknownRelated, {
          message:
            'Cannot read %s.%s — not a column of %s: %s. Filter and sort on ' +
            'its own columns',
          messageParams: [
            this.metadata.name,
            relation.name,
            relation.targetEntity,
            unknownRelated.join(', '),
          ],
        });
      }
    }

    this.assertFederatedReadable(options, joined, operation);

    // Read untyped: the type admits only the two directions, a caller's
    // runtime value need not.
    const direction = order.find((key) => {
      const { order: value }: PlainLiteralObject = key;
      return value !== SortOrder.ASC && value !== SortOrder.DESC;
    });
    if (direction !== undefined) {
      throw new RuntimeException({
        message: 'Cannot sort %s on "%s": the direction must be ASC or DESC',
        messageParams: [this.metadata.name, direction.field],
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      });
    }

    // Refuses a filter too complex to translate here, whatever the driver.
    if (options.where) this.toDnf(options.where);
  }

  /**
   * Refuse what a federated relation cannot answer exactly. It is read from
   * its own repository, so the root's store cannot sort by it, and a filter on
   * it must stand on its own (see `splitFederatedWhere`). Attaching it needs
   * the root column it is read by, so a read that returns rows must select it.
   */
  private assertFederatedReadable(
    options: RepositoryFindOneOptions<Entity>,
    joined: string[],
    operation: RowScopeQueryOperation,
  ): void {
    const federated = this.federatedRelations;
    if (federated.size === 0) return;

    const sorted = (options.order ?? [])
      .map((key) => key.relation)
      .find((relation) => relation !== undefined && federated.has(relation));
    if (sorted !== undefined) {
      throw new FederationException({
        message:
          'Cannot sort %s by federated relation "%s": it is read from its ' +
          'own repository. Sort by a column of %s',
        messageParams: [this.metadata.name, sorted, this.metadata.name],
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      });
    }

    const select =
      operation === RowScopeOperation.COUNT
        ? undefined
        : options.select?.map(String);
    const unselected = joined
      .map((name) => federated.get(name)?.relation)
      .find(
        (relation) => relation && select && !select.includes(relation.on.from),
      );
    if (unselected) {
      throw new FederationException({
        message:
          'Cannot join federated relation "%s" without selecting "%s", the ' +
          'column of %s it is read by',
        messageParams: [
          unselected.name,
          unselected.on.from,
          this.metadata.name,
        ],
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      });
    }

    splitFederatedWhere(options.where, new Set(federated.keys()));
  }

  /**
   * The federated relations a read joins.
   */
  private federatedJoins(join: JoinClause[] = []): FederatedRelation[] {
    const federated = this.federatedRelations;
    return join
      .map((clause) => federated.get(clause.relation))
      .filter((relation) => relation !== undefined);
  }

  /**
   * `query` as the driver runs it: without federated joins, and with each
   * filter on a federated relation turned into a condition on this entity's
   * own column. The driver then pages, sorts and counts the whole read.
   *
   * The related repositories are read under the `ctx` the call arrived with,
   * for the reason `applyQueryScope` resolves the scope before hooks run: a
   * hook must not choose which principal is enforced (see `callerCtx`).
   */
  private async toDriverQuery<Options extends RepositoryFindOneOptions<Entity>>(
    query: Options,
    caller: FederatedCaller,
  ): Promise<Options> {
    const federation = this.requireBinding().federation;
    if (!federation || this.federatedJoins(query.join).length === 0) {
      return query;
    }

    const join = (query.join ?? []).filter(
      (clause) => !federation.relations.has(clause.relation),
    );
    const root: FederationRoot = {
      rows: (columns, where, take) =>
        this.doFind({
          select: this.metadata.columns
            .filter((column) => columns.includes(column.name))
            .map((column) => column.name),
          where,
          join: join.length ? join : undefined,
          withDeleted: query.withDeleted,
          ctx: query.ctx,
          take,
        }),
    };

    const where = await federation.reader.rootWhere(
      root,
      splitFederatedWhere(query.where, new Set(federation.relations.keys())),
      federation.relations,
      {
        ctx: () => this.callerCtx(caller),
        withDeleted: query.withDeleted,
        maxKeys: federation.maxKeys,
      },
    );

    return { ...query, where, join: join.length ? join : undefined };
  }

  /**
   * Attach the federated relations `query` joins to the rows its driver
   * returned, read under the `ctx` the call arrived with (see
   * `toDriverQuery`).
   */
  private async attachFederated(
    rows: (Entity | null)[],
    query: RepositoryFindOneOptions<Entity>,
    caller: FederatedCaller,
  ): Promise<void> {
    const federation = this.requireBinding().federation;
    const relations = this.federatedJoins(query.join);
    if (!federation || relations.length === 0) return;

    await federation.reader.hydrate(
      rows.filter((row) => row !== null),
      relations,
      splitFederatedWhere(query.where, new Set(federation.relations.keys())),
      {
        ctx: () => this.callerCtx(caller),
        withDeleted: query.withDeleted,
        maxKeys: federation.maxKeys,
      },
    );
  }

  /**
   * The `ctx` the call arrived with, refused when its row scope is no longer
   * the one resolved before hooks ran. Returning another `ctx` from a hook
   * never reaches here. Called before every related read, so this catches a
   * hook, this entity's or a related one's, redefining a mutable
   * `RowScopeCtx` on the caller's own `ctx`.
   */
  private callerCtx({
    ctx,
    scope,
  }: FederatedCaller): PlainLiteralObject | undefined {
    const now = this.resolveRowScopeContext(ctx);
    const unchanged =
      now === undefined || scope === undefined
        ? now === scope
        : Object.keys(now).length === Object.keys(scope).length &&
          Object.keys(now).every((key) => now[key] === scope[key]);

    if (!unchanged) {
      throw new FederationException({
        message:
          'A hook changed the row scope on the ctx of a read of %s, so its ' +
          'federated relations cannot be read under it. Define RowScopeCtx ' +
          'with { immutable: true }',
        messageParams: [this.metadata.name],
        fault: 'usage',
      });
    }
    return ctx;
  }

  /**
   * Throw when a row the driver returned is not what the call asked for. A row
   * holds each relation in `join`, holding that relation's own columns, and may
   * hold its own columns; with `allowEagerRelations`, also any other declared
   * relation, holding its own columns too. A joined relation that is absent or
   * `undefined` is refused; any other property whose value is `undefined`
   * carries nothing and is not counted.
   */
  private assertRows(rows: (Entity | null)[], join: JoinClause[] = []): void {
    const columns = new Set(this.metadata.columns.map((column) => column.name));
    const relationColumns = new Map(
      (this.metadata.relations ?? []).map((relation) => [
        relation.name,
        new Set(relation.targetColumns.map((column) => column.name)),
      ]),
    );
    const joined = new Set(join.map((clause) => clause.relation));
    const unexpected = new Set<string>();
    const missing = new Set<string>();

    for (const row of rows) {
      if (!row) continue;
      const values: PlainLiteralObject = row;

      for (const name of joined) {
        if (values[name] === undefined) missing.add(name);
      }

      for (const key of Object.keys(values)) {
        const value: unknown = values[key];
        if (value === undefined || columns.has(key)) continue;

        const targetColumns = relationColumns.get(key);
        if (targetColumns && (joined.has(key) || this.allowsEagerRelations)) {
          for (const related of Array.isArray(value) ? value : [value]) {
            if (related === null) continue;
            if (!isObject(related)) {
              unexpected.add(key);
              continue;
            }
            const relatedValues: PlainLiteralObject = related;
            for (const field of Object.keys(relatedValues)) {
              if (
                relatedValues[field] !== undefined &&
                !targetColumns.has(field)
              ) {
                unexpected.add(`${key}.${field}`);
              }
            }
          }
          continue;
        }

        unexpected.add(key);
      }
    }

    if (missing.size > 0) {
      throw new RepositoryQueryException(this.metadata.name, {
        message:
          'The driver returned %s rows without relations their read joins: %s',
        messageParams: [this.metadata.name, [...missing].join(', ')],
      });
    }

    if (unexpected.size > 0) {
      throw new RepositoryQueryException(this.metadata.name, {
        message:
          'The driver returned %s properties nothing asked for: %s. A result ' +
          'holds its own columns and the relations its read joins',
        messageParams: [this.metadata.name, [...unexpected].join(', ')],
      });
    }
  }

  /** `row`, once `assertRows` has checked it. */
  private checkedRow(row: Entity): Entity {
    this.assertRows([row]);
    return row;
  }

  /**
   * The driver's `row` with the related rows a cascade wrote, each already
   * checked by its own repository.
   */
  private withRelated(row: Entity, related: PlainLiteralObject): Entity {
    return Object.assign<Entity, PlainLiteralObject>(row, related);
  }

  /**
   * Every condition in a where clause, at any depth.
   */
  private whereConditions(clause: WhereClause): WhereCondition[] {
    if (isWhereCondition(clause)) return [clause];
    if (isWhereCompound(clause)) {
      return clause.conditions.flatMap((child) => this.whereConditions(child));
    }
    return [];
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
    // A plain copy: the overlay's own values inherit from the context, so a
    // key the overlay lacks would otherwise read whatever the context holds.
    return appCtx.supports(RowScopeCtx)
      ? { ...appCtx.with(RowScopeCtx) }
      : undefined;
  }

  /**
   * Invoke the bound scope resolver for a write, and hand the driver what it
   * returns. A resolver refuses by throwing.
   *
   * `target` is the existing row the call is aimed at, where there is one:
   * the stored row `update`/`replace` were given, or the row an `upsert`'s
   * payload names after hooks.
   *
   * The row is pinned before this runs — see `toStoredRow` and, for
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
      repository: this,
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
    this.requireBinding();
    const scope = this.resolveRowScopeContext(options.ctx);

    return this.permeator.find.permeate(
      options,
      async (scoped) => {
        const query = await this.applyQueryScope(
          RowScopeOperation.FIND,
          scoped,
          scope,
        );
        const rows = await this.doFind(
          await this.toDriverQuery(query, { ctx: options.ctx, scope }),
        );
        await this.attachFederated(rows, query, { ctx: options.ctx, scope });
        this.assertRows(rows, query.join);
        return rows;
      },
      this.entityCtx(options.ctx),
    );
  }

  protected abstract doFind(
    options?: RepositoryFindOptions<Entity>,
  ): Promise<Entity[]>;

  async findOne(
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Entity | null> {
    this.requireBinding();
    const scope = this.resolveRowScopeContext(options.ctx);

    return this.permeator.findOne.permeate(
      options,
      async (scoped) => {
        const query = await this.applyQueryScope(
          RowScopeOperation.FIND_ONE,
          scoped,
          scope,
        );
        const row = await this.doFindOne(
          await this.toDriverQuery(query, { ctx: options.ctx, scope }),
        );
        await this.attachFederated([row], query, { ctx: options.ctx, scope });
        this.assertRows([row], query.join);
        return row;
      },
      this.entityCtx(options.ctx),
    );
  }

  protected abstract doFindOne(
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Entity | null>;

  async count(options: RepositoryFindOptions<Entity> = {}): Promise<number> {
    this.requireBinding();
    const scope = this.resolveRowScopeContext(options.ctx);

    return this.permeator.count.permeate(
      options,
      async (scoped) => {
        const { where, join, withDeleted, ctx } = await this.toDriverQuery(
          await this.applyQueryScope(RowScopeOperation.COUNT, scoped, scope),
          { ctx: options.ctx, scope },
        );
        // Only these decide how many rows match. The rest shape or page the
        // rows, so the driver is never handed them to interpret.
        return this.doCount({ where, join, withDeleted, ctx });
      },
      this.entityCtx(options.ctx),
    );
  }

  protected abstract doCount(options?: RepositoryCountOptions): Promise<number>;

  /**
   * Find entities and return with total count.
   */
  async findAndCount(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<[Entity[], number]> {
    this.requireBinding();
    const scope = this.resolveRowScopeContext(options.ctx);

    return this.permeator.findAndCount.permeate(
      options,
      async (scoped) => {
        const query = await this.applyQueryScope(
          RowScopeOperation.FIND_AND_COUNT,
          scoped,
          scope,
        );
        const [rows, total] = await this.doFindAndCount(
          await this.toDriverQuery(query, { ctx: options.ctx, scope }),
        );
        await this.attachFederated(rows, query, { ctx: options.ctx, scope });
        this.assertRows(rows, query.join);
        return [rows, total];
      },
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
    this.requireBinding();
    return this.permeator.create.permeate(
      entity,
      async (scoped) => {
        const { own, children } = this.cascade.peel(scoped);
        const value = this.toOwnColumns(
          await this.applyWriteScope(
            RowScopeOperation.CREATE,
            this.toOwnColumns(own),
            undefined,
            options?.ctx,
          ),
        );
        this.assertKeyNotPartial(value);
        await this.assertNotExisting(value, options?.ctx);
        const row = this.checkedRow(await this.doCreate(value, options));
        return this.withRelated(
          row,
          await this.cascade.create(row, children, options?.ctx),
        );
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
    this.requireBinding();
    return this.permeator.createMany.permeate(
      entities,
      async (scoped) => {
        const peeled = scoped.map((entity) => this.cascade.peel(entity));
        const values = (
          await this.applyWriteScopeMany(
            RowScopeOperation.CREATE_MANY,
            peeled.map(({ own }) => this.toOwnColumns(own)),
            [],
            options?.ctx,
          )
        ).map((entity) => this.toOwnColumns(entity));
        for (const value of values) {
          this.assertKeyNotPartial(value);
          await this.assertNotExisting(value, options?.ctx);
        }
        const rows = await this.doCreateMany(values, options);
        this.assertRows(rows);
        const written: Entity[] = [];
        for (const [index, row] of rows.entries()) {
          written.push(
            this.withRelated(
              row,
              await this.cascade.create(
                row,
                peeled[index]?.children ?? new Map(),
                options?.ctx,
              ),
            ),
          );
        }
        return written;
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
    options?: RepositoryUpdateOptions,
  ): Promise<Entity> {
    this.requireBinding();
    this.assertAppendable('update');
    const stored = this.toStoredRow(entity);
    const versionGuard = this.resolveVersionGuard(stored, options, 'guard');
    this.assertMutable(stored);
    return this.permeator.update.permeate(
      data,
      async (scoped) => {
        const { own, children } = this.cascade.peel(scoped);
        // Checked on the hooks' output and again on the resolver's, since
        // either could move the write to another row.
        const values = this.toOwnColumns(own);
        this.assertKeyUnchanged(stored, values);
        const written = this.toOwnColumns(
          await this.applyWriteScope(
            RowScopeOperation.UPDATE,
            values,
            stored,
            options?.ctx,
          ),
        );
        this.assertKeyUnchanged(stored, written);
        const row = this.checkedRow(
          await this.doUpdate(stored, written, { ...options, versionGuard }),
        );
        return this.withRelated(
          row,
          await this.cascade.sync(row, children, 'merge', options?.ctx),
        );
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doUpdate(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions & RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity>;

  async upsert(
    entity: DeepPartial<Entity>,
    options?: RepositoryUpsertOptions,
  ): Promise<Entity> {
    this.requireBinding();
    this.assertAppendable('upsert');
    return this.permeator.upsert.permeate(
      entity,
      async (scoped) => {
        const { own, children } = this.cascade.peel(scoped);
        const reduced = this.toOwnColumns(own);
        // After hooks, so the row found is the row the payload now names.
        const stored = await this.findByKey(reduced, options?.ctx);
        const written = this.toOwnColumns(
          await this.applyWriteScope(
            RowScopeOperation.UPSERT,
            reduced,
            stored,
            options?.ctx,
          ),
        );
        // After row scope, so a soft-deleted row in another scope is not found
        // rather than reported as soft-deleted.
        if (stored) this.assertMutable(stored);
        this.assertKeyUnchanged(reduced, written);
        const row = this.checkedRow(await this.doUpsert(written, options));
        return this.withRelated(
          row,
          await this.cascade.sync(row, children, 'replace', options?.ctx),
        );
      },
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
    options?: RepositoryUpdateOptions,
  ): Promise<Entity> {
    this.requireBinding();
    this.assertAppendable('replace');
    const stored = this.toStoredRow(entity);
    const versionGuard = this.resolveVersionGuard(stored, options, 'guard');
    this.assertMutable(stored);
    return this.permeator.replace.permeate(
      data,
      async (scoped) => {
        const { own, children } = this.cascade.peel(scoped);
        const values = this.toOwnColumns(own);
        this.assertKeyUnchanged(stored, values);
        const written = this.toOwnColumns(
          await this.applyWriteScope(
            RowScopeOperation.REPLACE,
            values,
            stored,
            options?.ctx,
          ),
        );
        this.assertKeyUnchanged(stored, written);
        const row = this.checkedRow(
          await this.doReplace(stored, written, { ...options, versionGuard }),
        );
        return this.withRelated(
          row,
          await this.cascade.sync(row, children, 'replace', options?.ctx),
        );
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doReplace(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions & RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity>;

  // Delete operations

  async delete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions,
  ): Promise<Entity> {
    this.requireBinding();
    this.assertAppendable('delete');
    const versionGuard = this.resolveVersionGuard(entity, options, 'skip');
    return this.permeator.delete.permeate(
      entity,
      async (scoped) => {
        const stored = this.toStoredRow(scoped);
        const value = this.toStoredRow(
          await this.applyWriteScope(
            RowScopeOperation.DELETE,
            stored,
            stored,
            options?.ctx,
          ),
        );
        await this.cascade.remove(value, 'delete', options?.ctx);
        return this.checkedRow(
          await this.doDelete(value, { ...options, versionGuard }),
        );
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doDelete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions &
      RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity>;

  async deleteMany(
    entities: Entity[],
    options?: RepositoryDeleteOptions,
  ): Promise<Entity[]> {
    this.requireBinding();
    this.assertAppendable('deleteMany');
    return this.permeator.deleteMany.permeate(
      entities,
      async (scoped) => {
        const stored = scoped.map((entity) => this.toStoredRow(entity));
        const values = (
          await this.applyWriteScopeMany(
            RowScopeOperation.DELETE_MANY,
            stored,
            stored,
            options?.ctx,
          )
        ).map((entity) => this.toStoredRow(entity));
        for (const value of values) {
          await this.cascade.remove(value, 'delete', options?.ctx);
        }
        const rows = await this.doDeleteMany(values, options);
        this.assertRows(rows);
        return rows;
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
    options?: RepositoryDeleteOneOptions,
  ): Promise<Entity> {
    this.requireBinding();
    this.assertAppendable('softDelete');
    const deleteDateColumn = this.requireDeleteDateColumn('softDelete');
    // Resolved (and, on a mismatch, thrown) ahead of the idempotent no-op
    // below, so a stale precondition against a row someone else already
    // deleted conflicts instead of quietly succeeding.
    const versionGuard = this.resolveVersionGuard(entity, options, 'skip');

    if (this.isSoftDeleted(entity, deleteDateColumn)) {
      // The no-op below returns without reaching the permeator, so scope is
      // consulted here or not at all — and "already deleted" must not become a
      // way to soft-delete a row the caller was never allowed to touch. The
      // returned value is discarded rather than returned: nothing is written,
      // so only the resolver's refusal is meaningful.
      const stored = this.toStoredRow(entity);
      await this.applyWriteScope(
        RowScopeOperation.SOFT_DELETE,
        stored,
        stored,
        options?.ctx,
      );

      // Idempotent rather than rejected: a retried delete must not fail.
      return entity;
    }

    return this.permeator.softDelete.permeate(
      entity,
      async (scoped) => {
        const stored = this.toStoredRow(scoped);
        const value = this.toStoredRow(
          await this.applyWriteScope(
            RowScopeOperation.SOFT_DELETE,
            stored,
            stored,
            options?.ctx,
          ),
        );
        await this.cascade.remove(value, 'softDelete', options?.ctx);
        return this.checkedRow(
          await this.doSoftDelete(value, { ...options, versionGuard }),
        );
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doSoftDelete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions &
      RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity>;

  async restore(
    entity: Entity,
    options?: RepositoryRestoreOptions,
  ): Promise<Entity> {
    this.requireBinding();
    this.assertAppendable('restore');
    this.requireDeleteDateColumn('restore');
    const versionGuard = this.resolveVersionGuard(entity, options, 'skip');
    return this.permeator.restore.permeate(
      entity,
      async (scoped) => {
        const stored = this.toStoredRow(scoped);
        const value = this.toStoredRow(
          await this.applyWriteScope(
            RowScopeOperation.RESTORE,
            stored,
            stored,
            options?.ctx,
          ),
        );
        await this.cascade.remove(value, 'restore', options?.ctx);
        return this.checkedRow(
          await this.doRestore(value, { ...options, versionGuard }),
        );
      },
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doRestore(
    entity: Entity,
    options?: RepositoryRestoreOptions & RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity>;

  // Utility methods

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
   *
   * Public so the startup checks, which run outside the adapter, can see
   * whether soft delete is possible for an entity.
   */
  getDeleteDateColumn(): (keyof Entity & string) | undefined {
    return this.metadata.columns.find((col) => col.isRemoveDate)?.name;
  }

  /**
   * The soft-remove date column, or a refusal: soft delete and restore are
   * meaningless on an entity without one.
   */
  private requireDeleteDateColumn(operation: string): keyof Entity & string {
    const column = this.getDeleteDateColumn();
    if (column) return column;

    throw new RuntimeException({
      message: 'Cannot %s %s: the entity has no soft-delete column',
      messageParams: [operation, this.metadata.name],
      fault: 'usage',
    });
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
   * Throw `AppendOnlyViolationException` if this entity is declared
   * append-only.
   *
   * Called first in every operation that targets a stored row, ahead of the
   * version guard and ahead of any early return. Ordering matters: were it to
   * run after `resolveVersionGuard`, a stale version would surface as an
   * `OptimisticLockException` and the caller would retry a write that can
   * never succeed; were it to run after `softDelete`'s missing-column return,
   * the refusal would depend on whether the entity happened to have a delete
   * date column.
   *
   * **Scope of this guarantee.** It covers the repository's own entry points.
   * It does not cover a direct `@InjectRepository` handle or a database
   * foreign key action, neither of which passes through one. Another entity's
   * write cannot reach this table: `toOwnColumns` keeps every write to its own
   * entity's table.
   */
  private assertAppendable(operation: string): void {
    if (isAppendOnly(this.writePolicyDeclaration)) {
      throw new AppendOnlyViolationException(this.metadata.name, operation);
    }
  }

  /**
   * Throw `SoftDeletedImmutableException` if `entity` is currently
   * soft-deleted. `restore()` is the only way back.
   */
  private assertMutable(entity: Entity): void {
    const deleteDateColumn = this.getDeleteDateColumn();
    if (!deleteDateColumn) return;

    if (this.isSoftDeleted(entity, deleteDateColumn)) {
      throw new SoftDeletedImmutableException(this.metadata.name);
    }
  }

  /**
   * Enforce that a create inserts rather than updates, whatever the driver's
   * write primitive does with a key that names a row.
   *
   * Reads via `doFindOne`, bypassing hooks and row scope: the question is
   * whether the key is taken, not whether the caller may see the row. A key is
   * only checkable when every primary column is present. `withDeleted` because
   * a soft-deleted row still occupies its key. See "Create Inserts, It Never
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
      // The default message points at `upsert`, which append-only refuses.
      throw new EntityAlreadyExistsException(
        this.metadata.name,
        isAppendOnly(this.writePolicyDeclaration)
          ? {
              message:
                'Cannot create %s: a record with that primary key already ' +
                'exists — append-only records are never overwritten. Give a ' +
                'new record an id the application generates, never one from ' +
                'the request',
            }
          : undefined,
      );
    }
  }

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

    const values: PlainLiteralObject = entity;
    const missing = primaryColumns.filter((col) => values[col] === undefined);

    if (missing.length === 0 || missing.length === primaryColumns.length) {
      return;
    }

    throw new PartialPrimaryKeyException(this.metadata.name, missing);
  }

  /**
   * An equality clause on every primary key column, read as given, or
   * `undefined` when the key is incomplete — nothing to identify a row with.
   */
  private keyClause(entity: DeepPartial<Entity>): WhereClause | undefined {
    const primaryColumns = this.getPrimaryColumns();
    if (primaryColumns.length === 0) return undefined;

    if (!isObject(entity)) return undefined;

    const values: PlainLiteralObject = entity;
    const conditions: WhereClause[] = [];
    for (const col of primaryColumns) {
      const value = values[col];
      if (value === undefined) return undefined;
      conditions.push(Where.eq(col, value));
    }

    return conditions.length === 1 ? conditions[0] : Where.and(...conditions);
  }

  /**
   * The stored row an upsert names, found by primary key alone.
   *
   * Unscoped, so it tells "no such row" from "not yours": handed to the
   * resolver as `target` to check, never trusted. Only read when the entity is
   * scoped or soft-deletable, the two things that need it.
   */
  private async findByKey(
    entity: DeepPartial<Entity>,
    ctx?: PlainLiteralObject,
  ): Promise<Entity | undefined> {
    if (!this.requireRowScope() && !this.getDeleteDateColumn()) {
      return undefined;
    }

    const where = this.keyClause(entity);
    if (!where) return undefined;

    return (
      (await this.doFindOne({ where, withDeleted: true, ctx })) ?? undefined
    );
  }

  /**
   * `payload` checked to hold only this entity's own columns, so a write
   * reaches only this entity's table.
   *
   * A relation is refused, an owning one included: its foreign key column is
   * the one way to set it. A key column — primary or foreign — takes a plain
   * value only, since a driver may read an object there as the related row.
   * So every check reads the same key the driver writes. Any other property
   * that is not a column is refused too, since a driver may write other tables
   * from it, skipping their row scope, write policy and hooks.
   *
   * A property whose value is `undefined` carries nothing and is left off, so it
   * neither reaches the driver nor fails a check — an entity class compiled
   * with standard class fields defines every declared property that way.
   *
   * Checks the payload of every write; see `toStoredRow` for the row a
   * write names.
   */
  private toOwnColumns<T extends DeepPartial<Entity>>(payload: T): T {
    if (!isObject(payload)) return payload;

    const owned = { ...payload };
    const values: PlainLiteralObject = owned;
    for (const key of Object.keys(values)) {
      if (values[key] === undefined) delete values[key];
    }

    const relations = this.metadata.relations ?? [];
    for (const relation of relations) {
      if (!(relation.name in values)) continue;

      throw new RelationWriteException(
        this.metadata.name,
        relation.name,
        (relation.foreignKey ?? [])
          .map((column) => column.from)
          .filter((column) => column !== relation.name),
      );
    }

    const allowed = new Set<string>(
      this.metadata.columns.map((column) => column.name),
    );
    const keys = new Set<string>([
      ...this.getPrimaryColumns(),
      ...relations.flatMap(({ foreignKey = [] }) =>
        foreignKey.map(({ from }) => from),
      ),
    ]);

    const invalid = Object.keys(values).filter(
      (key) =>
        typeof values[key] === 'function' ||
        (keys.has(key) && !this.isKeyValue(values[key])),
    );
    if (invalid.length) {
      throw new InvalidColumnValueException(this.metadata.name, invalid);
    }

    const unknown = Object.keys(values).filter((key) => !allowed.has(key));
    if (unknown.length) {
      throw new UnknownColumnException(this.metadata.name, unknown);
    }

    return owned;
  }

  /**
   * The stored row named by `update`, `replace` and the delete family,
   * reduced to its own columns.
   *
   * It names a row rather than carrying data to write, so a relation or
   * other property on it — however the row was read — is left out rather
   * than refused; nothing on it reaches the driver but its columns. Its
   * values are then checked as a payload's are: a function anywhere, or an
   * object in a key column, would still decide what the driver writes.
   */
  private toStoredRow<T extends DeepPartial<Entity>>(row: T): T {
    if (!isObject(row)) return row;

    const columns = new Set<string>(
      this.metadata.columns.map((column) => column.name),
    );
    const stored = { ...row };
    const values: PlainLiteralObject = stored;
    for (const key of Object.keys(values)) {
      if (!columns.has(key)) delete values[key];
    }

    return this.toOwnColumns(stored);
  }

  /**
   * Whether `value` can be written to a key column: a scalar, a date, binary,
   * `null` or `undefined` — anything but an object a driver could read as a
   * related row.
   */
  private isKeyValue(value: unknown): boolean {
    return (
      value === null ||
      typeof value !== 'object' ||
      value instanceof Date ||
      value instanceof Uint8Array
    );
  }

  /**
   * Whether two key values are the same: identical, or binary keys with the
   * same bytes.
   */
  private sameKey(current: unknown, key: unknown): boolean {
    if (current === key) return true;
    return (
      current instanceof Uint8Array &&
      key instanceof Uint8Array &&
      current.length === key.length &&
      current.every((byte, index) => byte === key[index])
    );
  }

  /**
   * Refuse a write whose values would name a different row than `target`.
   *
   * `update` and `replace` name the row to write in their entity argument;
   * their data carries field values, not a target. A primary key arriving
   * through the data decides the row instead — the write lands on a row the
   * caller never named. For `upsert`, `target` is the payload whose key the
   * row scope resolver checked, so its output cannot move the write either.
   *
   * Both arguments are already checked to hold only their own columns.
   */
  private assertKeyUnchanged(
    target: PlainLiteralObject,
    values: PlainLiteralObject,
  ): void {
    const primaryColumns = this.getPrimaryColumns();
    if (primaryColumns.length === 0) return;

    const changed = primaryColumns.filter(
      (column) =>
        column in values && !this.sameKey(values[column], target[column]),
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
   * guarded whether or not the caller stated a version. The delete paths
   * pass `'skip'`: guarded only when the caller states a version.
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

  // ═══════════════════════════════════════════════════════════════════════════
  // WhereClause AST helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Flatten a WhereClause tree into Disjunctive Normal Form:
   * an array of AND-branches, where each branch is a flat list
   * of WhereClause leaves. The outer array represents OR.
   *
   * Leaves are either WhereConditions or not(...) compounds
   * preserved for the driver to translate.
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
    const registered = this._hooks;
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
