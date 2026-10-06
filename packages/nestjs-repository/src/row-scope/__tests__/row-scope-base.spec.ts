import { describe, expect, it, vi } from 'vitest';

import { HttpStatus, type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';

import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import { type RowScopeWriteParams } from '../interfaces/row-scope.interface.js';
import {
  RowScopeBase,
  type RowScopeBaseRepository,
} from '../row-scope-base.js';
import {
  RowScopeOperation,
  type RowScopeValues,
  type RowScopeWriteOperation,
} from '../row-scope.types.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/**
 * `tenantId` is `unknown` deliberately: the `Scope` type parameter is a
 * convenience for reading the overlay, not a runtime guarantee that it carries
 * that shape, so the class has to validate what it reads.
 */
interface TenantScope extends PlainLiteralObject {
  tenantId?: unknown;
  role?: string;
}

const MINE = { tenantId: 'acme' };

const OWN_ROW = { id: 'row-1', tenantId: 'acme' };
const FOREIGN_ROW = { id: 'row-2', tenantId: 'other' };

const column = (name: string, isPrimary = false) => ({
  name,
  isPrimary,
  isRemoveDate: false,
  isVersion: false,
});

const SINGLE_KEY = [column('id', true), column('tenantId'), column('region')];
const COMPOSITE_KEY = [
  column('slug', true),
  column('locale', true),
  column('tenantId'),
];

const metadataOf = (
  columns: ReturnType<typeof column>[],
  relations?: { name: string; on: { from: string; to: string } }[],
) => ({
  name: 'Order',
  type: class Order {},
  columns,
  relations: relations?.map((relation) => ({
    ...relation,
    targetEntity: 'Other',
    cardinality: 'one' as const,
  })),
});

/**
 * `transform` settles a relation object into the column it backs, as a driver
 * does. An identity mock would make every rule-4 case pass vacuously.
 */
const repoWith = (
  columns: ReturnType<typeof column>[],
  rows: PlainLiteralObject[] = [],
  relations?: { name: string; on: { from: string; to: string } }[],
) => {
  const metadata = metadataOf(columns, relations);

  const findOne = vi.fn(async (options: PlainLiteralObject) => {
    const where = Reflect.get(options, 'where') ?? {};
    const conditions = Reflect.get(where, 'conditions') ?? [where];
    return (
      rows.find((row) =>
        conditions.every(
          (condition: PlainLiteralObject) =>
            row[condition.field] === condition.value,
        ),
      ) ?? null
    );
  });

  const transform = vi.fn((entityLike: PlainLiteralObject) => {
    const materialized: PlainLiteralObject = { ...entityLike };
    for (const relation of metadata.relations ?? []) {
      const related = materialized[relation.name];
      if (typeof related === 'object' && related !== null) {
        materialized[relation.on.from] = Reflect.get(related, relation.on.to);
      }
    }
    return materialized;
  });

  const repo: RowScopeBaseRepository = { findOne, metadata, transform };
  return { repo, findOne, transform };
};

const repoOf = (...rows: PlainLiteralObject[]) =>
  repoWith(SINGLE_KEY, rows, [
    { name: 'tenant', on: { from: 'tenantId', to: 'id' } },
  ]);

/** The default: one column, one value, straight from the options. */
class TestRowScope extends RowScopeBase<PlainLiteralObject, TenantScope> {
  constructor(repo: RowScopeBaseRepository) {
    super(repo, { scopeKey: 'tenantId', column: 'tenantId', label: 'Order' });
  }
}

/** Returns whatever the test supplies, so any scope shape can be exercised. */
class BoundRowScope extends RowScopeBase<PlainLiteralObject, TenantScope> {
  constructor(
    repo: RowScopeBaseRepository,
    private readonly values: RowScopeValues<PlainLiteralObject>,
  ) {
    super(repo, { scopeKey: 'tenantId', column: 'tenantId', label: 'Order' });
  }

  protected override resolveScope(): RowScopeValues<PlainLiteralObject> {
    return this.values;
  }
}

const scopeOf = (...rows: PlainLiteralObject[]) =>
  new TestRowScope(repoOf(...rows).repo);

const write = (
  scope: RowScopeBase<PlainLiteralObject, TenantScope>,
  overrides: Partial<RowScopeWriteParams<PlainLiteralObject, TenantScope>>,
) =>
  scope.scopeWrite({
    operation: RowScopeOperation.UPDATE,
    value: {},
    target: OWN_ROW,
    scope: MINE,
    ctx: undefined,
    ...overrides,
  });

const read = (
  scope: RowScopeBase<PlainLiteralObject, TenantScope>,
  options: { where?: WhereClause } = {},
) =>
  scope.scopeQuery({
    operation: RowScopeOperation.FIND,
    options,
    scope: MINE,
    ctx: undefined,
  });

const statusOf = async (run: () => Promise<unknown>): Promise<unknown> => {
  try {
    await run();
  } catch (error) {
    return error instanceof RuntimeException ? error.httpStatus : error;
  }
  return 'did not throw';
};

// ─── Specs ───────────────────────────────────────────────────────────────────

describe('RowScopeBase', () => {
  describe('construction', () => {
    it('refuses an entity with no primary key column', () => {
      const { repo } = repoWith([column('tenantId')]);

      expect(() => new TestRowScope(repo)).toThrow(/has no primary key column/);
    });

    it('refuses a scope column that is not on the entity', () => {
      const { repo } = repoWith([column('id', true)]);

      expect(() => new TestRowScope(repo)).toThrow(/is not a column on Order/);
    });

    it('accepts a scope column that is not a key', () => {
      // Existence is required; being a key is not. Every scope column in the
      // fixtures is an ordinary column.
      expect(() => scopeOf()).not.toThrow();
    });

    it('accepts a subclass that overrides resolveScope and configures nothing', () => {
      // Composite scope supplies its columns per request, so there is no
      // configuration to validate — and none should be demanded.
      class Overriding extends RowScopeBase<PlainLiteralObject, TenantScope> {
        protected override resolveScope(): RowScopeValues<PlainLiteralObject> {
          return { tenantId: 'acme' };
        }
      }

      expect(() => new Overriding(repoOf().repo, {})).not.toThrow();
    });

    it('faults as a usage error when the default resolver has no configuration', async () => {
      class Unconfigured extends RowScopeBase<
        PlainLiteralObject,
        TenantScope
      > {}
      const scope = new Unconfigured(repoOf().repo, {});

      await expect(
        scope.scopeWrite({
          operation: RowScopeOperation.CREATE,
          value: {},
          target: undefined,
          scope: MINE,
          ctx: undefined,
        }),
      ).rejects.toThrow(/No scopeKey\/column configured/);
    });
  });

  describe('rule 1 — reads inject the scope columns', () => {
    it('adds an eq predicate for the scope column', () => {
      expect(read(scopeOf())).toEqual({
        where: { field: 'tenantId', operator: 'eq', value: 'acme' },
      });
    });

    it('conjoins onto the caller clause rather than replacing it', () => {
      const caller: WhereClause = {
        field: 'status',
        operator: 'eq',
        value: 'open',
      };

      expect(read(scopeOf(), { where: caller })).toEqual({
        where: {
          operator: 'and',
          conditions: [
            caller,
            { field: 'tenantId', operator: 'eq', value: 'acme' },
          ],
        },
      });
    });

    it('reads nothing when the scope resolves to no columns', () => {
      // `return {}` is the natural way to write "this principal has no scope".
      // It must read nothing rather than everything.
      const scope = new BoundRowScope(repoOf().repo, {});

      expect(
        scope.scopeQuery({
          operation: RowScopeOperation.FIND,
          options: {},
          scope: MINE,
          ctx: undefined,
        }),
      ).toEqual({ where: { never: true } });
    });

    it('refuses a non-scalar scope value', async () => {
      const scope = scopeOf();

      expect(
        await statusOf(async () =>
          scope.scopeQuery({
            operation: RowScopeOperation.FIND,
            options: {},
            scope: { tenantId: null },
            ctx: undefined,
          }),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('rule 2 — the write pre-check', () => {
    it('queries on the primary key and the scope column together', async () => {
      const { repo, findOne } = repoOf(OWN_ROW);
      await write(new TestRowScope(repo), { target: OWN_ROW });

      expect(findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            operator: 'and',
            conditions: [
              { field: 'id', operator: 'eq', value: 'row-1' },
              { field: 'tenantId', operator: 'eq', value: 'acme' },
            ],
          },
          withDeleted: true,
        }),
      );
    });

    it('refuses a target outside the scope', async () => {
      const scope = scopeOf(FOREIGN_ROW);

      expect(await statusOf(() => write(scope, { target: FOREIGN_ROW }))).toBe(
        HttpStatus.NOT_FOUND,
      );
    });

    it('refuses a target with no resolvable key', async () => {
      const scope = scopeOf(OWN_ROW);

      expect(await statusOf(() => write(scope, { target: {} }))).toBe(
        HttpStatus.NOT_FOUND,
      );
    });

    it('passes ctx through, so the read joins the caller transaction', async () => {
      const { repo, findOne } = repoOf(OWN_ROW);
      const ctx = { marker: 'trx' };

      await write(new TestRowScope(repo), { target: OWN_ROW, ctx });

      expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ ctx }));
    });

    it('refuses when the row that came back is scoped elsewhere', async () => {
      // The pre-check goes through the public findOne, so a hook or a
      // scopeQuery override sits between it and the driver.
      const { repo, findOne } = repoOf(OWN_ROW);
      findOne.mockResolvedValueOnce(FOREIGN_ROW);

      expect(
        await statusOf(() =>
          write(new TestRowScope(repo), { target: OWN_ROW }),
        ),
      ).toBe(HttpStatus.NOT_FOUND);
    });

    it('resolves a composite key before querying', async () => {
      const { repo, findOne } = repoWith(COMPOSITE_KEY, [
        { slug: 'a', locale: 'en', tenantId: 'acme' },
      ]);
      const scope = new TestRowScope(repo);

      await write(scope, { target: { slug: 'a', locale: 'en' } });

      expect(findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            operator: 'and',
            conditions: [
              { field: 'slug', operator: 'eq', value: 'a' },
              { field: 'locale', operator: 'eq', value: 'en' },
              { field: 'tenantId', operator: 'eq', value: 'acme' },
            ],
          },
        }),
      );
    });

    it('refuses a partial composite key rather than querying', async () => {
      const { repo, findOne } = repoWith(COMPOSITE_KEY, [
        { slug: 'a', locale: 'en', tenantId: 'acme' },
      ]);

      expect(
        await statusOf(() =>
          write(new TestRowScope(repo), { target: { slug: 'a' } }),
        ),
      ).toBe(HttpStatus.NOT_FOUND);
      expect(findOne).not.toHaveBeenCalled();
    });

    it('refuses an unusable key shape as malformed input', async () => {
      const scope = scopeOf(OWN_ROW);

      expect(
        await statusOf(() => write(scope, { target: { id: { nested: 1 } } })),
      ).toBe(HttpStatus.BAD_REQUEST);
    });

    it('resolves a key supplied through a relation object', async () => {
      // The key route that defeated three earlier guards: a driver prefers the
      // relation over the column's own scalar.
      // The Profile shape: the primary key is itself a join column.
      const { repo, findOne } = repoWith(
        [column('acctId', true), column('tenantId')],
        [{ acctId: 'a1', tenantId: 'acme' }],
        [{ name: 'acct', on: { from: 'acctId', to: 'id' } }],
      );

      await write(new TestRowScope(repo), { target: { acct: { id: 'a1' } } });

      expect(findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            operator: 'and',
            conditions: [
              { field: 'acctId', operator: 'eq', value: 'a1' },
              { field: 'tenantId', operator: 'eq', value: 'acme' },
            ],
          },
        }),
      );
    });
  });

  describe('rule 3 — create stamps, and names no existing row', () => {
    it.each([RowScopeOperation.CREATE, RowScopeOperation.CREATE_MANY])(
      '%s stamps the scope column without reading',
      async (operation) => {
        const { repo, findOne } = repoOf();

        await expect(
          write(new TestRowScope(repo), { operation, value: { name: 'x' } }),
        ).resolves.toEqual({ name: 'x', tenantId: 'acme' });
        expect(findOne).not.toHaveBeenCalled();
      },
    );
  });

  describe('rule 4 — the scope column takes precedence', () => {
    it('stamps when the value omits the column', async () => {
      await expect(
        write(scopeOf(OWN_ROW), { value: { name: 'x' } }),
      ).resolves.toEqual({ name: 'x', tenantId: 'acme' });
    });

    it('passes a value that already agrees', async () => {
      await expect(
        write(scopeOf(OWN_ROW), { value: { tenantId: 'acme' } }),
      ).resolves.toEqual({ tenantId: 'acme' });
    });

    it('refuses a value scoped elsewhere', async () => {
      expect(
        await statusOf(() =>
          write(scopeOf(OWN_ROW), { value: { tenantId: 'other' } }),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
    });

    it('refuses a foreign scope supplied through a relation object', async () => {
      // The scalar is absent, so a check reading only `value[column]` stamps
      // 'acme' and the driver then writes 'other' from the relation.
      expect(
        await statusOf(() =>
          write(scopeOf(OWN_ROW), { value: { tenant: { id: 'other' } } }),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
    });

    it('returns a stamped copy rather than mutating the caller value', async () => {
      const value: PlainLiteralObject = { name: 'x' };

      const result = await write(scopeOf(OWN_ROW), { value });

      expect(value).toEqual({ name: 'x' });
      expect(result).toEqual({ name: 'x', tenantId: 'acme' });
    });

    it('refuses every write when the scope resolves to no columns', async () => {
      const scope = new BoundRowScope(repoOf(OWN_ROW).repo, {});

      expect(
        await statusOf(() =>
          scope.scopeWrite({
            operation: RowScopeOperation.CREATE,
            value: {},
            target: undefined,
            scope: MINE,
            ctx: undefined,
          }),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('upsert', () => {
    it('takes its key from the value and pre-checks it', async () => {
      const { repo, findOne } = repoOf(OWN_ROW);

      await write(new TestRowScope(repo), {
        operation: RowScopeOperation.UPSERT,
        value: { id: 'row-1' },
        // The adapter found a row for this key, so the conflict clause can
        // fire and the write has to be treated as an update.
        target: OWN_ROW,
      });

      expect(findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            operator: 'and',
            conditions: [
              { field: 'id', operator: 'eq', value: 'row-1' },
              { field: 'tenantId', operator: 'eq', value: 'acme' },
            ],
          },
        }),
      );
    });

    it('inserts without a pre-check when the key names no row', async () => {
      // No target means the adapter's unscoped read found nothing, so the
      // conflict clause cannot fire and there is no existing row to own.
      // Stamping is the whole obligation.
      const { repo, findOne } = repoOf();

      await expect(
        write(new TestRowScope(repo), {
          operation: RowScopeOperation.UPSERT,
          value: { id: 'row-new', name: 'x' },
          target: undefined,
        }),
      ).resolves.toEqual({ id: 'row-new', name: 'x', tenantId: 'acme' });
      expect(findOne).not.toHaveBeenCalled();
    });

    it('still refuses an insert carrying a foreign scope', async () => {
      expect(
        await statusOf(() =>
          write(scopeOf(), {
            operation: RowScopeOperation.UPSERT,
            value: { id: 'row-new', tenantId: 'other' },
            target: undefined,
          }),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
    });

    it('refuses an absent key as a bad request, not a not-found', async () => {
      // A column the caller omitted may be filled by a database default, so the
      // conflict can still land on an existing row.
      expect(
        await statusOf(() =>
          write(scopeOf(OWN_ROW), {
            operation: RowScopeOperation.UPSERT,
            value: {},
            target: undefined,
          }),
        ),
      ).toBe(HttpStatus.BAD_REQUEST);
    });

    it('refuses a partial composite key', async () => {
      const { repo } = repoWith(COMPOSITE_KEY, [
        { slug: 'a', locale: 'en', tenantId: 'acme' },
      ]);

      expect(
        await statusOf(() =>
          write(new TestRowScope(repo), {
            operation: RowScopeOperation.UPSERT,
            value: { slug: 'a' },
            target: undefined,
          }),
        ),
      ).toBe(HttpStatus.BAD_REQUEST);
    });

    it('refuses a key naming a row outside the scope', async () => {
      expect(
        await statusOf(() =>
          write(scopeOf(FOREIGN_ROW), {
            operation: RowScopeOperation.UPSERT,
            value: { id: 'row-2' },
            // A row exists for the key. That it came back from an unscoped
            // read makes it a question, not a permission.
            target: FOREIGN_ROW,
          }),
        ),
      ).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('the delete family', () => {
    it.each([
      RowScopeOperation.DELETE,
      RowScopeOperation.DELETE_MANY,
      RowScopeOperation.SOFT_DELETE,
      RowScopeOperation.RESTORE,
    ])('%s pre-checks and returns the value unchanged', async (operation) => {
      const value = { id: 'row-1', note: 'kept' };

      await expect(
        write(scopeOf(OWN_ROW), { operation, value, target: OWN_ROW }),
      ).resolves.toEqual(value);
    });

    it.each([
      RowScopeOperation.DELETE,
      RowScopeOperation.DELETE_MANY,
      RowScopeOperation.SOFT_DELETE,
      RowScopeOperation.RESTORE,
    ])(
      '%s pre-checks the value, which is what the driver acts on',
      async (operation) => {
        // The value is the row the driver removes, so a value naming a foreign
        // row must refuse even when the target looks fine.
        expect(
          await statusOf(() =>
            write(scopeOf(OWN_ROW), {
              operation,
              value: { id: 'row-2' },
              target: OWN_ROW,
            }),
          ),
        ).toBe(HttpStatus.NOT_FOUND);
      },
    );
  });

  describe('a principal that reads more broadly than it writes', () => {
    /** The documented cross-tenant reader: a `scopeQuery` override. */
    class AdminReadableScope extends TestRowScope {
      override scopeQuery<Options extends { where?: WhereClause }>(
        params: Parameters<TestRowScope['scopeQuery']>[0] & {
          options: Options;
        },
      ): Options {
        if (params.scope?.role === 'admin') return params.options;
        return super.scopeQuery(params);
      }
    }

    const ADMIN = { tenantId: 'acme', role: 'admin' };

    it('reads without a scope predicate', () => {
      const scope = new AdminReadableScope(repoOf(OWN_ROW, FOREIGN_ROW).repo);

      expect(
        scope.scopeQuery({
          operation: RowScopeOperation.FIND,
          options: {},
          scope: ADMIN,
          ctx: undefined,
        }),
      ).toEqual({});
    });

    it('still cannot write outside its own scope', async () => {
      const scope = new AdminReadableScope(repoOf(FOREIGN_ROW).repo);

      expect(
        await statusOf(() =>
          scope.scopeWrite({
            operation: RowScopeOperation.UPDATE,
            value: {},
            target: FOREIGN_ROW,
            scope: ADMIN,
            ctx: undefined,
          }),
        ),
      ).toBe(HttpStatus.NOT_FOUND);
    });

    it('still stamps its own scope on a create', async () => {
      const scope = new AdminReadableScope(repoOf().repo);

      await expect(
        scope.scopeWrite({
          operation: RowScopeOperation.CREATE,
          value: { name: 'x' },
          target: undefined,
          scope: ADMIN,
          ctx: undefined,
        }),
      ).resolves.toEqual({ name: 'x', tenantId: 'acme' });
    });
  });

  describe('composite scope', () => {
    it('predicates and stamps every column', async () => {
      const { repo, findOne } = repoWith(SINGLE_KEY, [
        { id: 'row-1', tenantId: 'acme', region: 'eu' },
      ]);
      const scope = new BoundRowScope(repo, {
        tenantId: 'acme',
        region: 'eu',
      });

      await expect(
        scope.scopeWrite({
          operation: RowScopeOperation.CREATE,
          value: { name: 'x' },
          target: undefined,
          scope: MINE,
          ctx: undefined,
        }),
      ).resolves.toEqual({ name: 'x', tenantId: 'acme', region: 'eu' });

      await scope.scopeWrite({
        operation: RowScopeOperation.UPDATE,
        value: {},
        target: { id: 'row-1' },
        scope: MINE,
        ctx: undefined,
      });

      expect(findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            operator: 'and',
            conditions: [
              { field: 'id', operator: 'eq', value: 'row-1' },
              { field: 'tenantId', operator: 'eq', value: 'acme' },
              { field: 'region', operator: 'eq', value: 'eu' },
            ],
          },
        }),
      );
    });
  });

  describe('numeric scope and key values', () => {
    it('are handled as scalars', async () => {
      const { repo } = repoWith(
        [column('id', true), column('tenantId')],
        [{ id: 7, tenantId: 42 }],
      );
      const scope = new BoundRowScope(repo, { tenantId: 42 });

      await expect(
        scope.scopeWrite({
          operation: RowScopeOperation.UPDATE,
          value: {},
          target: { id: 7 },
          scope: MINE,
          ctx: undefined,
        }),
      ).resolves.toEqual({ tenantId: 42 });
    });
  });

  it('faults as a usage error on an unhandled write operation', async () => {
    // Only reachable by adding an operation without a case for it, so this is
    // a framework defect rather than anything the caller did — but it still
    // fails closed.
    const scope = scopeOf(OWN_ROW);

    await expect(
      write(scope, { operation: 'teleport' as RowScopeWriteOperation }),
    ).rejects.toMatchObject({
      fault: 'usage',
      message: expect.stringContaining('teleport'),
    });
  });
});
