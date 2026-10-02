import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type DeepPartial, RuntimeException } from '@concepta/nestjs-core';

import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import {
  type RepositoryCreateOptions,
  type RepositoryDeleteOneOptions,
  type RepositoryDeleteOptions,
  type RepositoryFindOneOptions,
  type RepositoryFindOptions,
  type RepositoryRestoreOptions,
  type RepositoryUpdateOptions,
  type RepositoryUpsertOptions,
} from '../../repository/interfaces/repository-options.interface.js';
import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import { RepositoryAdapter } from '../../repository/repository-adapter.js';
import { Where } from '../../repository/where.helpers.js';
import {
  type RowScopeInterface,
  type RowScopeQueryParams,
  type RowScopeWriteParams,
} from '../interfaces/row-scope.interface.js';
import { RowScopeOperation } from '../row-scope.types.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

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

/**
 * Records every callback invocation. Deliberately returns its input
 * unchanged — this suite is about whether the framework calls the resolver,
 * not about what a resolver decides.
 */
class RecordingRowScope implements RowScopeInterface {
  readonly queries: RowScopeQueryParams<{ where?: WhereClause }>[] = [];
  readonly writes: RowScopeWriteParams[] = [];

  scopeQuery<Options extends { where?: WhereClause }>(
    params: RowScopeQueryParams<Options>,
  ): Options {
    this.queries.push(params);
    return params.options;
  }

  scopeWrite<Value extends PlainLiteralObject>(
    params: RowScopeWriteParams<Value>,
  ): Value {
    this.writes.push(params);
    return params.value;
  }

  operations(): string[] {
    return [
      ...this.queries.map((q) => q.operation),
      ...this.writes.map((w) => w.operation),
    ];
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
  };

  /** Options/values the driver was ultimately handed, per operation. */
  readonly received: { operation: string; payload: unknown }[] = [];

  private record<T>(operation: string, payload: T): T {
    this.received.push({ operation, payload });
    return payload;
  }

  protected async doFind(options?: RepositoryFindOptions<Row>): Promise<Row[]> {
    this.record(RowScopeOperation.FIND, options);
    return [];
  }
  protected async doFindOne(
    options: RepositoryFindOneOptions<Row>,
  ): Promise<Row | null> {
    this.record(RowScopeOperation.FIND_ONE, options);
    return null;
  }
  protected async doCount(
    options?: RepositoryFindOptions<Row>,
  ): Promise<number> {
    this.record(RowScopeOperation.COUNT, options);
    return 0;
  }
  protected async doFindAndCount(
    options?: RepositoryFindOptions<Row>,
  ): Promise<[Row[], number]> {
    this.record(RowScopeOperation.FIND_AND_COUNT, options);
    return [[], 0];
  }
  protected async doCreate(
    entity: DeepPartial<Row>,
    _options?: RepositoryCreateOptions,
  ): Promise<Row> {
    this.record(RowScopeOperation.CREATE, entity);
    return this.transform(entity);
  }
  protected async doCreateMany(
    entities: DeepPartial<Row>[],
    _options?: RepositoryCreateOptions,
  ): Promise<Row[]> {
    this.record(RowScopeOperation.CREATE_MANY, entities);
    return entities.map((e) => this.transform(e));
  }
  protected async doUpdate(
    entity: Row,
    data: DeepPartial<Row>,
    _options?: RepositoryUpdateOptions<Row>,
  ): Promise<Row> {
    this.record(RowScopeOperation.UPDATE, data);
    return entity;
  }
  protected async doUpsert(
    entity: DeepPartial<Row>,
    _options?: RepositoryUpsertOptions,
  ): Promise<Row> {
    this.record(RowScopeOperation.UPSERT, entity);
    return this.transform(entity);
  }
  protected async doReplace(
    entity: Row,
    data: DeepPartial<Row>,
    _options?: RepositoryUpdateOptions<Row>,
  ): Promise<Row> {
    this.record(RowScopeOperation.REPLACE, data);
    return entity;
  }
  protected async doDelete(
    entity: Row,
    _options?: RepositoryDeleteOneOptions<Row>,
  ): Promise<Row> {
    this.record(RowScopeOperation.DELETE, entity);
    return entity;
  }
  protected async doDeleteMany(
    entities: Row[],
    _options?: RepositoryDeleteOptions,
  ): Promise<Row[]> {
    this.record(RowScopeOperation.DELETE_MANY, entities);
    return entities;
  }
  protected async doSoftDelete(
    entity: Row,
    _options?: RepositoryDeleteOneOptions<Row>,
  ): Promise<Row> {
    this.record(RowScopeOperation.SOFT_DELETE, entity);
    return entity;
  }
  protected async doRestore(
    entity: Row,
    _options?: RepositoryRestoreOptions<Row>,
  ): Promise<Row> {
    this.record(RowScopeOperation.RESTORE, entity);
    return entity;
  }

  transform(entityLike: DeepPartial<Row>): Row {
    return Object.assign(new RowClass(), entityLike) as Row;
  }

  merge(mergeIntoEntity: Row, ...entityLikes: DeepPartial<Row>[]): Row {
    return Object.assign(mergeIntoEntity, ...entityLikes);
  }
}

/** A resolver that refuses any write whose value carries `name`. */
const refusingOn = (name: string): RowScopeInterface => ({
  scopeQuery: (params) => params.options,
  scopeWrite: (params) => {
    if (params.value.name === name) {
      throw new RuntimeException({ message: 'refused', fault: 'client' });
    }
    return params.value;
  },
});

const row = (overrides: Partial<Row> = {}): Row => ({
  id: 'row-1',
  name: 'original',
  dateDeleted: null,
  ...overrides,
});

/**
 * One entry per operation. Keyed by `RowScopeOperation` so a new operation
 * added to the contract without a case here fails to compile — the invocation
 * guarantee is the only thing the framework owns, and an operation quietly
 * missing from this table is exactly how it would rot.
 */
const CALLS: Record<
  RowScopeOperation,
  { run: (repo: TestAdapter) => Promise<unknown>; invocations: number }
> = {
  [RowScopeOperation.FIND]: { run: (repo) => repo.find({}), invocations: 1 },
  [RowScopeOperation.FIND_ONE]: {
    run: (repo) => repo.findOne({ where: Where.eq('id', 'row-1') }),
    invocations: 1,
  },
  [RowScopeOperation.COUNT]: { run: (repo) => repo.count({}), invocations: 1 },
  [RowScopeOperation.FIND_AND_COUNT]: {
    run: (repo) => repo.findAndCount({}),
    invocations: 1,
  },
  [RowScopeOperation.CREATE]: {
    run: (repo) => repo.create({ name: 'new' }),
    invocations: 1,
  },
  // Batch operations invoke the callback once per element, not once per call.
  [RowScopeOperation.CREATE_MANY]: {
    run: (repo) => repo.createMany([{ name: 'a' }, { name: 'b' }]),
    invocations: 2,
  },
  [RowScopeOperation.UPDATE]: {
    run: (repo) => repo.update(row(), { name: 'next' }),
    invocations: 1,
  },
  [RowScopeOperation.REPLACE]: {
    run: (repo) => repo.replace(row(), { name: 'next' }),
    invocations: 1,
  },
  [RowScopeOperation.UPSERT]: {
    run: (repo) => repo.upsert({ name: 'new' }),
    invocations: 1,
  },
  [RowScopeOperation.DELETE]: {
    run: (repo) => repo.delete(row()),
    invocations: 1,
  },
  [RowScopeOperation.DELETE_MANY]: {
    run: (repo) => repo.deleteMany([row(), row()]),
    invocations: 2,
  },
  [RowScopeOperation.SOFT_DELETE]: {
    run: (repo) => repo.softDelete(row()),
    invocations: 1,
  },
  [RowScopeOperation.RESTORE]: {
    run: (repo) => repo.restore(row()),
    invocations: 1,
  },
};

// ─── Specs ───────────────────────────────────────────────────────────────────

describe('row scope invocation guarantee', () => {
  let repo: TestAdapter;
  let rowScope: RecordingRowScope;

  beforeEach(() => {
    repo = new TestAdapter('rows');
    rowScope = new RecordingRowScope();
    repo.setRowScope(rowScope);
  });

  it('covers every operation in the contract', () => {
    expect(Object.keys(CALLS).sort()).toEqual(
      Object.values(RowScopeOperation).sort(),
    );
  });

  it.each(Object.values(RowScopeOperation))(
    'invokes the resolver for %s',
    async (operation) => {
      const { run, invocations } = CALLS[operation];

      await run(repo);

      const invoked = rowScope
        .operations()
        .filter((recorded) => recorded === operation);

      expect(invoked).toEqual(Array(invocations).fill(operation));
    },
  );

  it('invokes the resolver before the driver sees the call', async () => {
    await repo.find({});

    expect(rowScope.operations()).toEqual([RowScopeOperation.FIND]);
    expect(repo.received.map((r) => r.operation)).toEqual([
      RowScopeOperation.FIND,
    ]);
  });

  it('never invokes the resolver when none is bound', async () => {
    const unscoped = new TestAdapter('rows');

    await unscoped.find({});

    expect(rowScope.operations()).toEqual([]);
    expect(unscoped.received).toHaveLength(1);
  });

  describe('batch operations', () => {
    it('invokes the resolver once per createMany element', async () => {
      await repo.createMany([{ name: 'a' }, { name: 'b' }]);

      expect(rowScope.writes.map((w) => w.value)).toEqual([
        { name: 'a' },
        { name: 'b' },
      ]);
    });

    it('invokes the resolver once per deleteMany element, with each row as its own target', async () => {
      const rows = [row({ id: 'a' }), row({ id: 'b' })];

      await repo.deleteMany(rows);

      expect(rowScope.writes.map((w) => w.target)).toEqual(rows);
    });

    it('refuses the whole batch when any element is refused', async () => {
      const refusingRepo = new TestAdapter('rows');
      refusingRepo.setRowScope(refusingOn('bad'));

      await expect(
        refusingRepo.createMany([{ name: 'ok' }, { name: 'bad' }]),
      ).rejects.toThrow(RuntimeException);
      expect(refusingRepo.received).toHaveLength(0);
    });
  });

  describe("the resolver's returned value is what the driver runs", () => {
    /** Stamps a marker so the driver payload is distinguishable from the input. */
    const stamping: RowScopeInterface = {
      scopeQuery: (params) => params.options,
      scopeWrite: (params) => ({ ...params.value, stamped: true }),
    };

    /** Each operation's payload has a different shape; only the mark matters. */
    const stampOf = (payload: unknown): unknown =>
      payload && typeof payload === 'object' && 'stamped' in payload
        ? payload.stamped
        : undefined;

    it.each([
      RowScopeOperation.CREATE,
      RowScopeOperation.UPDATE,
      RowScopeOperation.REPLACE,
      RowScopeOperation.DELETE,
      RowScopeOperation.SOFT_DELETE,
      RowScopeOperation.RESTORE,
      RowScopeOperation.UPSERT,
    ])('hands the driver the stamped value for %s', async (operation) => {
      const stampingRepo = new TestAdapter('rows');
      stampingRepo.setRowScope(stamping);

      await CALLS[operation].run(stampingRepo);

      const received = stampingRepo.received.find(
        (call) => call.operation === operation,
      );
      expect(stampOf(received?.payload)).toEqual(true);
    });

    it('hands the driver every stamped element of a batch', async () => {
      const stampingRepo = new TestAdapter('rows');
      stampingRepo.setRowScope(stamping);

      await stampingRepo.createMany([{ name: 'a' }, { name: 'b' }]);

      expect(
        stampingRepo.received.find(
          (call) => call.operation === RowScopeOperation.CREATE_MANY,
        )?.payload,
      ).toEqual([
        { name: 'a', stamped: true },
        { name: 'b', stamped: true },
      ]);
    });
  });

  describe('write targets', () => {
    it.each([
      RowScopeOperation.UPDATE,
      RowScopeOperation.REPLACE,
      RowScopeOperation.DELETE,
      RowScopeOperation.SOFT_DELETE,
      RowScopeOperation.RESTORE,
    ])('passes the existing row as the target for %s', async (operation) => {
      const target = row();
      const calls: Record<string, () => Promise<unknown>> = {
        [RowScopeOperation.UPDATE]: () => repo.update(target, { name: 'x' }),
        [RowScopeOperation.REPLACE]: () => repo.replace(target, { name: 'x' }),
        [RowScopeOperation.DELETE]: () => repo.delete(target),
        [RowScopeOperation.SOFT_DELETE]: () => repo.softDelete(target),
        [RowScopeOperation.RESTORE]: () => repo.restore(target),
      };

      await calls[operation]();

      const write = rowScope.writes.find((w) => w.operation === operation);
      expect(write?.target).toEqual(target);
    });

    it.each([
      RowScopeOperation.CREATE,
      RowScopeOperation.CREATE_MANY,
      RowScopeOperation.UPSERT,
    ])('passes no target for %s', async (operation) => {
      await CALLS[operation].run(repo);

      const write = rowScope.writes.find((w) => w.operation === operation);
      expect(write?.target).toBeUndefined();
    });
  });
});
