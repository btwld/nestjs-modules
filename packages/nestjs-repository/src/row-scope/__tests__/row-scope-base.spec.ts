import { describe, expect, it, vi } from 'vitest';

import { HttpStatus, type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';

import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import {
  type RowScopeRepository,
  type RowScopeWriteParams,
} from '../interfaces/row-scope.interface.js';
import { RowScopeBase, type RowScopeBaseOptions } from '../row-scope-base.js';
import { RowScopeOperation } from '../row-scope.types.js';

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

/** Every column the specs use, optional so a row can carry any subset. */
interface RowFixture {
  id?: string | number;
  tenantId?: string | number;
  region?: string;
  slug?: string;
  locale?: string;
  status?: string;
  name?: string;
}

const MINE = { tenantId: 'acme' };

const OWN_ROW = { id: 'row-1', tenantId: 'acme' };
const FOREIGN_ROW = { id: 'row-2', tenantId: 'other' };

const column = (name: keyof RowFixture, isPrimary = false) => ({
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

const metadataOf = (columns: ReturnType<typeof column>[]) => ({
  name: 'Order',
  type: class Order {},
  urn: 'urn:memory:Order',
  columns,
});

const repoWith = (
  columns: ReturnType<typeof column>[],
  rows: RowFixture[] = [],
) => {
  const metadata = metadataOf(columns);

  const findOne = vi.fn(async (options: PlainLiteralObject) => {
    const where = Reflect.get(options, 'where') ?? {};
    const conditions = Reflect.get(where, 'conditions') ?? [where];
    return (
      rows.find((row) =>
        conditions.every(
          (condition: PlainLiteralObject) =>
            Reflect.get(row, condition.field) === condition.value,
        ),
      ) ?? null
    );
  });

  const repo: RowScopeRepository = { findOne, metadata };
  return { repo, findOne };
};

const repoOf = (...rows: RowFixture[]) => repoWith(SINGLE_KEY, rows);

/** Scoped by `tenantId` unless the test configures otherwise. */
class TestRowScope extends RowScopeBase<TenantScope> {
  constructor(options: RowScopeBaseOptions = { scope: ['tenantId'] }) {
    super(options);
  }
}

/** A resolver and the repository it is scoping a write for. */
interface Scoped {
  resolver: RowScopeBase<TenantScope>;
  repository: RowScopeRepository;
}

const scoped = (
  repository: RowScopeRepository,
  resolver: RowScopeBase<TenantScope> = new TestRowScope(),
): Scoped => ({ resolver, repository });

const scopeOf = (...rows: RowFixture[]): Scoped => scoped(repoOf(...rows).repo);

const write = (
  { resolver, repository }: Scoped,
  overrides: Partial<RowScopeWriteParams<PlainLiteralObject, TenantScope>>,
) =>
  resolver.scopeWrite({
    operation: RowScopeOperation.UPDATE,
    value: {},
    target: OWN_ROW,
    repository,
    scope: MINE,
    ctx: undefined,
    ...overrides,
  });

const read = (
  resolver: RowScopeBase<TenantScope>,
  options: { where?: WhereClause } = {},
  scope: TenantScope = MINE,
) =>
  resolver.scopeQuery({
    operation: RowScopeOperation.FIND,
    options,
    scope,
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
    it('reports each scope column with the key its value is read from', () => {
      const resolver = new TestRowScope({
        scope: ['tenantId', { column: 'region', key: 'area' }],
      });

      expect(resolver.scopeColumns).toEqual([
        { column: 'tenantId', key: 'tenantId' },
        { column: 'region', key: 'area' },
      ]);
    });

    it('is joinable only when configured to be', () => {
      // Joinable states every read is exactly equality on the scope columns,
      // which a scopeQuery override may not keep — so never by default.
      expect(new TestRowScope().joinable).toBe(false);
      expect(
        new TestRowScope({ scope: ['tenantId'], joinable: true }).joinable,
      ).toBe(true);
    });

    it("reads a column's value from its configured key", () => {
      const resolver = new TestRowScope({
        scope: [{ column: 'region', key: 'area' }],
      });

      expect(read(resolver, {}, { area: 'eu' })).toEqual({
        where: { field: 'region', operator: 'eq', value: 'eu' },
      });
    });
  });

  describe('one resolver, many entities', () => {
    it('pre-checks each write against the repository it is for', async () => {
      const resolver = new TestRowScope();
      const orders = repoOf(OWN_ROW);
      const lines = repoOf();

      await write({ resolver, repository: orders.repo }, { target: OWN_ROW });
      expect(
        await statusOf(() =>
          write({ resolver, repository: lines.repo }, { target: OWN_ROW }),
        ),
      ).toBe(HttpStatus.NOT_FOUND);

      expect(orders.findOne).toHaveBeenCalledTimes(1);
      expect(lines.findOne).toHaveBeenCalledTimes(1);
    });

    it('names the entity in its refusals', async () => {
      const lines = repoWith(SINGLE_KEY);
      const repository = {
        ...lines.repo,
        metadata: { ...lines.repo.metadata, name: 'OrderLine' },
      };

      await expect(
        write({ resolver: new TestRowScope(), repository }, {}),
      ).rejects.toThrow('OrderLine not found');
    });
  });

  describe('rule 1 — reads inject the scope columns', () => {
    it('adds an eq predicate for the scope column', () => {
      expect(read(new TestRowScope())).toEqual({
        where: { field: 'tenantId', operator: 'eq', value: 'acme' },
      });
    });

    it('conjoins onto the caller clause rather than replacing it', () => {
      const caller: WhereClause = {
        field: 'status',
        operator: 'eq',
        value: 'open',
      };

      expect(read(new TestRowScope(), { where: caller })).toEqual({
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
      expect(read(new TestRowScope({ scope: [] }))).toEqual({
        where: { never: true },
      });
    });

    it('refuses a non-scalar scope value', async () => {
      expect(
        await statusOf(async () =>
          read(new TestRowScope(), {}, { tenantId: null }),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('rule 2 — the write pre-check', () => {
    it('queries on the primary key and the scope column together', async () => {
      const { repo, findOne } = repoOf(OWN_ROW);
      await write(scoped(repo), { target: OWN_ROW });

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

      await write(scoped(repo), { target: OWN_ROW, ctx });

      expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ ctx }));
    });

    it('resolves a composite key before querying', async () => {
      const { repo, findOne } = repoWith(COMPOSITE_KEY, [
        { slug: 'a', locale: 'en', tenantId: 'acme' },
      ]);
      const scope = scoped(repo);

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
        await statusOf(() => write(scoped(repo), { target: { slug: 'a' } })),
      ).toBe(HttpStatus.NOT_FOUND);
      expect(findOne).not.toHaveBeenCalled();
    });

    it('refuses an unusable key shape as malformed input', async () => {
      const scope = scopeOf(OWN_ROW);

      expect(
        await statusOf(() => write(scope, { target: { id: { nested: 1 } } })),
      ).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('rule 3 — create stamps, and names no existing row', () => {
    it.each([RowScopeOperation.CREATE, RowScopeOperation.CREATE_MANY])(
      '%s stamps the scope column without reading',
      async (operation) => {
        const { repo, findOne } = repoOf();

        await expect(
          write(scoped(repo), { operation, value: { name: 'x' } }),
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

    it('returns a stamped copy rather than mutating the caller value', async () => {
      const value: PlainLiteralObject = { name: 'x' };

      const result = await write(scopeOf(OWN_ROW), { value });

      expect(value).toEqual({ name: 'x' });
      expect(result).toEqual({ name: 'x', tenantId: 'acme' });
    });

    it('refuses every write when the scope resolves to no columns', async () => {
      const scope = scoped(
        repoOf(OWN_ROW).repo,
        new TestRowScope({ scope: [] }),
      );

      expect(
        await statusOf(() =>
          write(scope, {
            operation: RowScopeOperation.CREATE,
            target: undefined,
          }),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('upsert', () => {
    it('takes its key from the value and pre-checks it', async () => {
      const { repo, findOne } = repoOf(OWN_ROW);

      await write(scoped(repo), {
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
        write(scoped(repo), {
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
          write(scoped(repo), {
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
      expect(read(new AdminReadableScope(), {}, ADMIN)).toEqual({});
    });

    it('still cannot write outside its own scope', async () => {
      const scope = scoped(repoOf(FOREIGN_ROW).repo, new AdminReadableScope());

      expect(
        await statusOf(() =>
          write(scope, { target: FOREIGN_ROW, scope: ADMIN }),
        ),
      ).toBe(HttpStatus.NOT_FOUND);
    });

    it('still stamps its own scope on a create', async () => {
      const scope = scoped(repoOf().repo, new AdminReadableScope());

      await expect(
        write(scope, {
          operation: RowScopeOperation.CREATE,
          value: { name: 'x' },
          target: undefined,
          scope: ADMIN,
        }),
      ).resolves.toEqual({ name: 'x', tenantId: 'acme' });
    });
  });

  describe('composite scope', () => {
    it('predicates and stamps every column', async () => {
      const { repo, findOne } = repoWith(SINGLE_KEY, [
        { id: 'row-1', tenantId: 'acme', region: 'eu' },
      ]);
      const scope = scoped(
        repo,
        new TestRowScope({ scope: ['tenantId', 'region'] }),
      );
      const caller = { tenantId: 'acme', region: 'eu' };

      await expect(
        write(scope, {
          operation: RowScopeOperation.CREATE,
          value: { name: 'x' },
          target: undefined,
          scope: caller,
        }),
      ).resolves.toEqual({ name: 'x', tenantId: 'acme', region: 'eu' });

      await write(scope, { target: { id: 'row-1' }, scope: caller });

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
      await expect(
        write(scoped(repo), { target: { id: 7 }, scope: { tenantId: 42 } }),
      ).resolves.toEqual({ tenantId: 42 });
    });
  });
});
