import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { AppContextHost, type DeepPartial } from '@concepta/nestjs-core';

import { SoftDeletedImmutableException } from '../../exceptions/soft-deleted-immutable.exception.js';
import { FederationOrchestrator } from '../../federation/federation-orchestrator.service.js';
import { RepoHookMethodKey } from '../../hooks/repository-hook.decorators.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import {
  type RepositoryDeleteOneOptions,
  type RepositoryDeleteOptions,
  type RepositoryFindOneOptions,
  type RepositoryFindOptions,
  type RepositoryRestoreOptions,
  type RepositoryUpsertOptions,
} from '../../repository/interfaces/repository-options.interface.js';
import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import { RepositoryAdapter } from '../../repository/repository-adapter.js';
import { RowScopeBootException } from '../exceptions/row-scope-boot.exception.js';
import { RowScopeUnboundException } from '../exceptions/row-scope-unbound.exception.js';
import { RowScopeCtx } from '../interfaces/row-scope-context.interface.js';
import {
  type RowScopeInterface,
  type RowScopeQueryParams,
  type RowScopeWriteParams,
} from '../interfaces/row-scope.interface.js';
import { RowScopeOperation } from '../row-scope.types.js';

interface Row extends PlainLiteralObject {
  id: string;
  name: string;
  dateDeleted: Date | null;
}

class RowClass {
  declare id: string;
  declare name: string;
  declare dateDeleted: Date | null;
}

/** Passes everything through untouched, recording what it was asked. */
class RecordingRowScope implements RowScopeInterface {
  readonly queries: {
    operation: string;
    options: PlainLiteralObject;
    ctx: PlainLiteralObject | undefined;
    scope: PlainLiteralObject | undefined;
  }[] = [];
  readonly writes: RowScopeWriteParams[] = [];

  scopeQuery<Options extends { where?: WhereClause }>(
    params: RowScopeQueryParams<Options>,
  ): Options {
    const { operation, options, ctx, scope } = params;
    this.queries.push({ operation, options, ctx, scope });
    return options;
  }

  scopeWrite<Value extends PlainLiteralObject>(
    params: RowScopeWriteParams<Value>,
  ): Value {
    this.writes.push(params);
    return params.value;
  }
}

class PassthroughRowScope implements RowScopeInterface {
  scopeQuery<Options extends { where?: WhereClause }>(
    params: RowScopeQueryParams<Options>,
  ): Options {
    return params.options;
  }

  scopeWrite<Value extends PlainLiteralObject>(
    params: RowScopeWriteParams<Value>,
  ): Value {
    return params.value;
  }
}

class TestAdapter extends RepositoryAdapter<Row> {
  readonly metadata: RepositoryMetadataInterface<Row> = {
    name: 'Row',
    type: RowClass as Type<Row>,
    columns: [
      { name: 'id', isPrimary: true, isRemoveDate: false, isVersion: false },
      { name: 'name', isPrimary: false, isRemoveDate: false, isVersion: false },
      {
        name: 'dateDeleted',
        isPrimary: false,
        isRemoveDate: true,
        isVersion: false,
      },
    ],
    // Declared so the relation-stripping on write paths has something to
    // strip; no row fixture carries it unless a test adds it.
    relations: [
      {
        name: 'peer',
        targetEntity: 'Row',
        cardinality: 'one',
        on: { from: 'peerId', to: 'id' },
      },
    ],
  };

  /** What `doFindOne` returns — stands in for the row already in the table. */
  existing: Row | null = null;

  readonly findOneCalls: RepositoryFindOneOptions<Row>[] = [];
  readonly driverCalls: { operation: string; payload: unknown }[] = [];

  protected async doFind(options?: RepositoryFindOptions<Row>): Promise<Row[]> {
    this.driverCalls.push({
      operation: RowScopeOperation.FIND,
      payload: options,
    });
    return [];
  }
  protected async doFindOne(
    options: RepositoryFindOneOptions<Row>,
  ): Promise<Row | null> {
    this.findOneCalls.push(options);
    return this.existing;
  }
  protected async doCount(): Promise<number> {
    return 0;
  }
  protected async doFindAndCount(): Promise<[Row[], number]> {
    return [[], 0];
  }
  protected async doCreate(entity: DeepPartial<Row>): Promise<Row> {
    return this.transform(entity);
  }
  protected async doCreateMany(entities: DeepPartial<Row>[]): Promise<Row[]> {
    return entities.map((e) => this.transform(e));
  }
  protected async doUpdate(entity: Row): Promise<Row> {
    return entity;
  }
  protected async doUpsert(
    entity: DeepPartial<Row>,
    _options?: RepositoryUpsertOptions,
  ): Promise<Row> {
    this.driverCalls.push({
      operation: RowScopeOperation.UPSERT,
      payload: entity,
    });
    return this.transform(entity);
  }
  protected async doReplace(entity: Row): Promise<Row> {
    return entity;
  }
  protected async doDelete(
    entity: Row,
    _options?: RepositoryDeleteOneOptions<Row>,
  ): Promise<Row> {
    return entity;
  }
  protected async doDeleteMany(
    entities: Row[],
    _options?: RepositoryDeleteOptions,
  ): Promise<Row[]> {
    return entities;
  }
  protected async doSoftDelete(
    entity: Row,
    _options?: RepositoryDeleteOneOptions<Row>,
  ): Promise<Row> {
    this.driverCalls.push({
      operation: RowScopeOperation.SOFT_DELETE,
      payload: entity,
    });
    return entity;
  }
  protected async doRestore(
    entity: Row,
    _options?: RepositoryRestoreOptions<Row>,
  ): Promise<Row> {
    return entity;
  }

  transform(entityLike: DeepPartial<Row>): Row {
    return Object.assign(new RowClass(), entityLike) as Row;
  }
  merge(mergeIntoEntity: Row, ...entityLikes: DeepPartial<Row>[]): Row {
    return Object.assign(mergeIntoEntity, ...entityLikes);
  }
}

const row = (overrides: Partial<Row> = {}): Row => ({
  id: 'row-1',
  name: 'original',
  dateDeleted: null,
  ...overrides,
});

const scopedTo = (resolver: Type<RowScopeInterface>) =>
  ({ access: 'scoped', resolver }) as const;

/** A context carrying an immutable RowScopeCtx, as an interceptor would build. */
const callerCtx = (tenantId = 'acme'): AppContextHost => {
  const ctx = new AppContextHost();
  ctx.defineOverlay(RowScopeCtx, { tenantId }, { immutable: true });
  return ctx;
};

describe('row scope ordering guarantees', () => {
  let repo: TestAdapter;
  let rowScope: RecordingRowScope;

  beforeEach(() => {
    repo = new TestAdapter('rows');
    rowScope = new RecordingRowScope();
    repo.setRowScope(rowScope);
  });

  describe('softDelete of an already soft-deleted row', () => {
    it('still consults the resolver, even though the write is a no-op', async () => {
      await repo.softDelete(row({ dateDeleted: new Date() }));

      expect(rowScope.writes.map((w) => w.operation)).toEqual([
        RowScopeOperation.SOFT_DELETE,
      ]);
      // The idempotent early return means the driver is never reached — which
      // is exactly why the resolver has to be consulted before it.
      expect(repo.driverCalls).toEqual([]);
    });

    it('strips relations before the resolver sees the row', async () => {
      // This branch returns before the permeator, so it is the one write path
      // that does its own stripping rather than inheriting it. A relation here
      // would let the resolver identify a different row than the one the
      // caller named.
      await repo.softDelete({
        ...row({ dateDeleted: new Date() }),
        peer: { id: 'another-row' },
      });

      expect(rowScope.writes[0]?.value.peer).toBeUndefined();
      expect(rowScope.writes[0]?.target?.peer).toBeUndefined();
    });

    it('lets the resolver refuse a row the caller cannot touch', async () => {
      class Refusing extends PassthroughRowScope {
        scopeWrite<Value extends PlainLiteralObject>(
          _params: RowScopeWriteParams<Value>,
        ): Value {
          throw new SoftDeletedImmutableException('Row');
        }
      }
      const refusingRepo = new TestAdapter('rows');
      refusingRepo.setRowScope(new Refusing());

      await expect(
        refusingRepo.softDelete(row({ dateDeleted: new Date() })),
      ).rejects.toThrow(SoftDeletedImmutableException);
    });
  });

  describe("upsert's soft-delete pre-read", () => {
    it('is scoped', async () => {
      await repo.upsert({ id: 'row-1', name: 'next' });

      const preRead = rowScope.queries.find(
        (query) => query.operation === RowScopeOperation.FIND_ONE,
      );

      expect(preRead?.options.withDeleted).toBe(true);
    });

    it('reaches the driver carrying what the resolver returned', async () => {
      // The pre-read asks for withDeleted: true; a resolver that overrides it
      // proves the driver ran the resolver's options, not the original ones.
      class Narrowing extends PassthroughRowScope {
        scopeQuery<Options extends { where?: WhereClause }>(
          params: RowScopeQueryParams<Options>,
        ): Options {
          return { ...params.options, withDeleted: false };
        }
      }
      const narrowingRepo = new TestAdapter('rows');
      narrowingRepo.setRowScope(new Narrowing());

      await narrowingRepo.upsert({ id: 'row-1', name: 'next' });

      expect(narrowingRepo.findOneCalls[0]?.withDeleted).toBe(false);
    });

    it('only reports a soft-deleted row the scoped read actually returned', async () => {
      repo.existing = row({ dateDeleted: new Date() });
      await expect(repo.upsert({ id: 'row-1', name: 'next' })).rejects.toThrow(
        SoftDeletedImmutableException,
      );

      // A resolver whose predicate excludes the row makes the same upsert
      // succeed — the exception cannot report rows the caller cannot see.
      repo.existing = null;
      await expect(
        repo.upsert({ id: 'row-1', name: 'next' }),
      ).resolves.toBeDefined();
    });
  });

  describe("upsert's target lookup", () => {
    it('hands the resolver the stored row the key names', async () => {
      repo.existing = row();

      await repo.upsert({ id: 'row-1', name: 'next' });

      expect(rowScope.writes[0]?.operation).toBe(RowScopeOperation.UPSERT);
      expect(rowScope.writes[0]?.target).toEqual(row());
    });

    it('hands the resolver no target when the key names nothing', async () => {
      repo.existing = null;

      await repo.upsert({ id: 'row-new', name: 'next' });

      expect(rowScope.writes[0]?.target).toBeUndefined();
    });

    it('finds the row unscoped, so a resolver can tell absent from foreign', async () => {
      // The whole point of the lookup: a resolver's own reads carry its scope
      // predicate, so they cannot distinguish "no such row" from "not yours".
      // Two driver reads happen — the soft-delete pre-read, which is public
      // and so scoped, and this one — but only the first reaches `scopeQuery`.
      repo.existing = row();

      await repo.upsert({ id: 'row-1', name: 'next' });

      expect(repo.findOneCalls).toHaveLength(2);
      expect(
        rowScope.queries.filter(
          (query) => query.operation === RowScopeOperation.FIND_ONE,
        ),
      ).toHaveLength(1);
    });

    it('is skipped when no resolver is bound', async () => {
      // An unscoped repository must not pay for a read it has no use for, so
      // only the soft-delete pre-read remains.
      const unbound = new TestAdapter('rows');
      unbound.existing = row();

      await unbound.upsert({ id: 'row-1', name: 'next' });

      expect(unbound.findOneCalls).toHaveLength(1);
    });
  });

  describe('ctx is passed through, not rewritten', () => {
    it('hands the driver whatever the resolver returned, including its ctx', async () => {
      const replacement = new AppContextHost();
      class Substituting extends PassthroughRowScope {
        scopeQuery<Options extends { where?: WhereClause }>(
          params: RowScopeQueryParams<Options>,
        ): Options {
          return { ...params.options, ctx: replacement };
        }
      }
      const substitutingRepo = new TestAdapter('rows');
      substitutingRepo.setRowScope(new Substituting());

      await substitutingRepo.find({ ctx: callerCtx() });

      // The framework does not touch the return — this is the resolver's
      // choice reaching the driver, not a framework override.
      expect(substitutingRepo.driverCalls[0]?.payload).toEqual({
        ctx: replacement,
      });
    });

    it('hands the resolver the ctx the driver will run under', async () => {
      const ctx = callerCtx();

      await repo.find({ ctx });

      expect(rowScope.queries[0]?.ctx).toEqual(ctx);
    });
  });

  describe('scope comes from the RowScopeCtx overlay', () => {
    it('resolves the overlay for reads', async () => {
      await repo.find({ ctx: callerCtx('acme') });

      expect(rowScope.queries[0]?.scope).toEqual({ tenantId: 'acme' });
    });

    it('resolves the overlay for writes', async () => {
      await repo.softDelete(row(), { ctx: callerCtx('acme') });

      expect(rowScope.writes[0]?.scope).toEqual({ tenantId: 'acme' });
    });

    it('is undefined when no overlay was attached, leaving the resolver to fail closed', async () => {
      await repo.find({ ctx: new AppContextHost() });

      expect(rowScope.queries[0]?.scope).toBeUndefined();
    });

    it('is undefined when there is no ctx at all', async () => {
      await repo.find({});

      expect(rowScope.queries[0]?.scope).toBeUndefined();
    });
  });

  describe('declared but unbound', () => {
    it('refuses reads rather than running them unscoped', async () => {
      const declared = new TestAdapter(
        'rows',
        undefined,
        scopedTo(PassthroughRowScope),
      );

      await expect(declared.find({})).rejects.toThrow(RowScopeUnboundException);
      expect(declared.driverCalls).toEqual([]);
    });

    it('refuses writes rather than running them unscoped', async () => {
      const declared = new TestAdapter(
        'rows',
        undefined,
        scopedTo(PassthroughRowScope),
      );

      await expect(declared.softDelete(row())).rejects.toThrow(
        RowScopeUnboundException,
      );
    });

    it('serves normally once a resolver is bound', async () => {
      const declared = new TestAdapter(
        'rows',
        undefined,
        scopedTo(PassthroughRowScope),
      );
      declared.setRowScope(new PassthroughRowScope());

      await expect(declared.find({})).resolves.toEqual([]);
    });

    it('does not refuse an entity declared public', async () => {
      const publicRepo = new TestAdapter('rows', undefined, {
        access: 'public',
        reason: 'shared reference data',
      });

      await expect(publicRepo.find({})).resolves.toEqual([]);
    });
  });

  describe('a hook that reassigns options.ctx', () => {
    /**
     * Stands in for a `beforeRead` hook returning `{ ...options, ctx: other }`,
     * where `other` carries a different tenant. `runHooks` is what the
     * permeator calls, so overriding it produces the same post-hook payload a
     * real hook would.
     */
    class CtxRewritingAdapter extends TestAdapter {
      readonly foreignCtx = callerCtx('someone-else');

      protected async runHooks<T>(
        methodKey: Parameters<TestAdapter['runHooks']>[0],
        payload: T,
      ): Promise<T> {
        if (methodKey === RepoHookMethodKey.BEFORE_READ && payload) {
          return { ...payload, ctx: this.foreignCtx };
        }
        return payload;
      }
    }

    let rewriting: CtxRewritingAdapter;

    beforeEach(() => {
      rewriting = new CtxRewritingAdapter('rows');
      rewriting.setRowScope(rowScope);
    });

    it('cannot change which principal the resolver enforces against', async () => {
      await rewriting.find({ ctx: callerCtx('acme') });

      // The hook swapped in a context scoped to someone else; scope was
      // already resolved from the caller's, before hooks ran.
      expect(rowScope.queries[0]?.scope).toEqual({ tenantId: 'acme' });
    });

    it('does change the ctx the operation runs under, which is its business', async () => {
      await rewriting.find({ ctx: callerCtx('acme') });

      expect(rowScope.queries[0]?.ctx).toEqual(rewriting.foreignCtx);
      expect(rewriting.driverCalls[0]?.payload).toEqual({
        ctx: rewriting.foreignCtx,
      });
    });

    it('cannot reach the ctx a write resolver is handed', async () => {
      // Writes never route `options` through the permeator — only the value —
      // so `params.ctx` on a write is the caller's own. That is what makes a
      // resolver's visibility read join the caller's transaction, and it is
      // asserted here so a refactor cannot quietly change it.
      class WriteHookAdapter extends TestAdapter {
        protected async runHooks<T>(
          _methodKey: Parameters<TestAdapter['runHooks']>[0],
          payload: T,
        ): Promise<T> {
          if (payload && typeof payload === 'object') {
            return { ...payload, ctx: callerCtx('someone-else') };
          }
          return payload;
        }
      }
      const writeRepo = new WriteHookAdapter('rows');
      writeRepo.setRowScope(rowScope);
      const ctx = callerCtx('acme');

      await writeRepo.softDelete(row(), { ctx });

      expect(rowScope.writes[0]?.ctx).toEqual(ctx);
      expect(rowScope.writes[0]?.scope).toEqual({ tenantId: 'acme' });
    });

    it('cannot establish a scope by attaching the overlay itself', async () => {
      class LateScopeAdapter extends TestAdapter {
        protected async runHooks<T>(
          methodKey: Parameters<TestAdapter['runHooks']>[0],
          payload: T,
        ): Promise<T> {
          if (methodKey === RepoHookMethodKey.BEFORE_READ && payload) {
            return { ...payload, ctx: callerCtx('smuggled') };
          }
          return payload;
        }
      }
      const late = new LateScopeAdapter('rows');
      late.setRowScope(rowScope);

      // Caller had no scope attached, so there is none — a hook cannot supply
      // one after the fact.
      await late.find({ ctx: new AppContextHost() });

      expect(rowScope.queries[0]?.scope).toBeUndefined();
    });
  });

  describe('federated findAndCount', () => {
    it('is scoped, because the orchestrator re-enters the public method', async () => {
      const federated = new TestAdapter('rows');
      federated.setRowScope(rowScope);
      federated.metadata.relations = [
        {
          name: 'peers',
          targetEntity: 'Peer',
          cardinality: 'many',
          on: { from: 'id', to: 'rowId' },
          federated: true,
        },
      ];

      // Stands in for FederationOrchestrator: it decomposes the query and
      // re-enters findAndCount without the federated join. Nothing about row
      // scope is wired into it — that is the point.
      const orchestrator: FederationOrchestrator = Object.assign(
        Object.create(FederationOrchestrator.prototype),
        { findAndCount: async () => federated.findAndCount({}) },
      );
      federated.setFederationOrchestrator(orchestrator);

      await federated.findAndCount({ join: [{ relation: 'peers' }] });

      expect(rowScope.queries.map((query) => query.operation)).toEqual([
        RowScopeOperation.FIND_AND_COUNT,
      ]);
    });
  });

  describe('binding', () => {
    it('refuses to replace a resolver that is already bound', () => {
      expect(() => repo.setRowScope(new PassthroughRowScope())).toThrow(
        RowScopeBootException,
      );
    });

    it('reports whether a resolver is bound', () => {
      expect(repo.hasRowScopeResolver).toBe(true);
      expect(new TestAdapter('rows').hasRowScopeResolver).toBe(false);
    });
  });
});
