import {
  AppContextHost,
  HooksCtx,
  RuntimeException,
} from '@concepta/nestjs-core';

import { RepositoryDatabaseException } from '../../exceptions/repository-database.exception.js';
import { RepositoryQueryException } from '../../exceptions/repository-query.exception.js';
import {
  isWhereNever,
  type WhereClause,
} from '../interfaces/where-clause.interface.js';
import { RepositoryAdapter } from '../repository-adapter.js';
import { WhereCompoundOperator } from '../repository.types.js';
import { Where } from '../where.helpers.js';

import { TestRepositoryAdapter } from './fixtures/test-repository-adapter.fixture.js';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe(RepositoryAdapter.name, () => {
  let adapter: TestRepositoryAdapter;

  beforeEach(() => {
    adapter = new TestRepositoryAdapter('test-entity');
    adapter.bind({});
  });

  describe('toDnf', () => {
    it('should return single-element branch for a condition', () => {
      const cond = Where.eq('id', '1');
      const result = adapter.exposedToDnf(cond);
      expect(result).toEqual([[cond]]);
    });

    it('should flatten AND into a single branch', () => {
      const a = Where.eq('id', '1');
      const b = Where.gt('version', 2);
      const result = adapter.exposedToDnf(Where.and(a, b));
      expect(result).toEqual([[a, b]]);
    });

    it('should flatten OR into separate branches', () => {
      const a = Where.eq('id', '1');
      const b = Where.eq('id', '2');
      const result = adapter.exposedToDnf(Where.or(a, b));
      expect(result).toEqual([[a], [b]]);
    });

    it('should distribute AND over OR (DNF conversion)', () => {
      const a = Where.eq('id', '1');
      const b = Where.eq('name', 'x');
      const c = Where.eq('name', 'y');
      // AND(a, OR(b, c)) => OR(AND(a,b), AND(a,c))
      const result = adapter.exposedToDnf(Where.and(a, Where.or(b, c)));
      expect(result).toEqual([
        [a, b],
        [a, c],
      ]);
    });

    // ─── Where.never() — the sole FALSE encoding ────────────────────────
    //
    // toDnf never returns `[]`: that would be ambiguous between "no
    // constraint" (TRUE) and "nothing matches" (FALSE), and a where-clause
    // compiler resolving that ambiguity fail-open is exactly how an
    // unsatisfiable scope silently evaporates into "match everything".
    // `[[Where.never()]]` — a single branch, a single WhereNever leaf — is
    // the only representation of FALSE; every case below either produces
    // it, produces a genuinely satisfiable result, or throws.

    it('should return the never leaf as its own single-element branch', () => {
      const result = adapter.exposedToDnf(Where.never());
      expect(result).toEqual([[Where.never()]]);
    });

    it('should resolve an empty OR to never (OR has no branches to try)', () => {
      const emptyOr: WhereClause = {
        operator: WhereCompoundOperator.OR,
        conditions: [],
      };
      const result = adapter.exposedToDnf(emptyOr);
      expect(result).toEqual([[Where.never()]]);
    });

    it('should drop never-branches out of an OR, keeping the rest', () => {
      const a = Where.eq('id', '1');
      const result = adapter.exposedToDnf(Where.or(Where.never(), a));
      expect(result).toEqual([[a]]);
    });

    it('should resolve an OR of only never-branches to never', () => {
      const result = adapter.exposedToDnf(
        Where.or(Where.never(), Where.never()),
      );
      expect(result).toEqual([[Where.never()]]);
    });

    it("should resolve an empty AND to never — a deliberate deviation from AND's logical identity (true), since this is a security-relevant AST and unreachable through Where.and() itself (it throws on empty args)", () => {
      const emptyAnd: WhereClause = {
        operator: WhereCompoundOperator.AND,
        conditions: [],
      };
      const result = adapter.exposedToDnf(emptyAnd);
      expect(result).toEqual([[Where.never()]]);
    });

    it('should resolve an AND containing a never sub-clause to never, even alongside a satisfiable one', () => {
      const a = Where.eq('id', '1');
      const result = adapter.exposedToDnf(Where.and(a, Where.never()));
      expect(result).toEqual([[Where.never()]]);
    });

    it('should resolve an AND(OR(...), never) to never — never propagates through nested compounds', () => {
      const a = Where.eq('id', '1');
      const b = Where.eq('id', '2');
      const result = adapter.exposedToDnf(
        Where.and(Where.or(a, b), Where.never()),
      );
      expect(result).toEqual([[Where.never()]]);
    });

    it('should throw for a node that is neither a condition, a compound, nor never', () => {
      const bogus = {} as WhereClause;
      expect(() => adapter.exposedToDnf(bogus)).toThrow(RuntimeException);
    });

    it('should throw for a compound with an unrecognized operator', () => {
      const bogus: WhereClause = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        operator: 'xor' as any,
        conditions: [Where.eq('id', '1')],
      };
      expect(() => adapter.exposedToDnf(bogus)).toThrow(RuntimeException);
    });

    it('never leaves surviving toDnf should still satisfy isWhereNever', () => {
      const [[leaf]] = adapter.exposedToDnf(Where.never());
      expect(isWhereNever(leaf)).toBe(true);
    });
  });

  describe('cartesianProduct', () => {
    it('should compute product of two groups', () => {
      const a = Where.eq('id', '1');
      const b = Where.eq('id', '2');
      const c = Where.eq('name', 'x');

      const result = adapter.exposedCartesianProduct([[[a], [b]], [[c]]]);
      expect(result).toEqual([
        [a, c],
        [b, c],
      ]);
    });
  });

  describe('a driver error', () => {
    const reads: [string, (repo: TestRepositoryAdapter) => Promise<unknown>][] =
      [
        ['find', (repo) => repo.find()],
        ['findOne', (repo) => repo.findOne({})],
      ];

    it.each(reads)(
      'is wrapped by %s in a RepositoryQueryException that keeps it as the cause',
      async (_, run) => {
        const failure = run(adapter);

        await expect(failure).rejects.toBeInstanceOf(RepositoryQueryException);
        await expect(failure).rejects.toHaveProperty(
          'cause.message',
          'not implemented',
        );
      },
    );

    it.each(reads)(
      'is wrapped by %s in a RepositoryDatabaseException when the driver reports it',
      async (_, run) => {
        class ReportingAdapter extends TestRepositoryAdapter {
          protected override describeDatabaseError(error: unknown) {
            return error instanceof Error
              ? { database: 'testdb', code: 'E42', message: error.message }
              : undefined;
          }
        }

        const reporting = new ReportingAdapter('test-entity');
        reporting.bind({});
        const failure = run(reporting);

        await expect(failure).rejects.toBeInstanceOf(RepositoryQueryException);
        await expect(failure).rejects.toThrow(
          expect.objectContaining({
            name: RepositoryDatabaseException.name,
            errorCode: 'REPOSITORY_DATABASE_ERROR',
            fault: 'internal',
            message:
              'The testdb database failed a query on the test-entity ' +
              'repository: not implemented',
            context: expect.objectContaining({
              entityName: 'test-entity',
              database: 'testdb',
              code: 'E42',
            }),
          }),
        );
      },
    );
  });

  describe('getPrimaryColumns', () => {
    it('should return primary column names', () => {
      // Access via metadata — getPrimaryColumns is protected but we can verify
      // through the columns metadata
      const primaries = adapter.metadata.columns
        .filter((c) => c.isPrimary)
        .map((c) => c.name);
      expect(primaries).toEqual(['id']);
    });
  });

  describe('getVersionColumn', () => {
    it('should return the version column name', () => {
      expect(adapter.exposedGetVersionColumn()).toBe('version');
    });
  });

  describe('entityCtx', () => {
    it('should scope each repository to its own entity, even when repositories share one ctx', () => {
      const repoA = new TestRepositoryAdapter('entity-a');
      const repoB = new TestRepositoryAdapter('entity-b');
      const ctx = new AppContextHost();

      const ambientA = repoA.exposedEntityCtx(ctx);
      const ambientB = repoB.exposedEntityCtx(ctx);

      expect(ambientA?.entity).toBe('entity-a');
      expect(ambientB?.entity).toBe('entity-b');
    });

    it('should still inherit an already-defined overlay from the shared ctx', () => {
      const ctx = new AppContextHost();
      ctx.defineOverlay(HooksCtx, { hooks: [] });

      const ambient = adapter.exposedEntityCtx(ctx);

      expect(ambient?.hooks).toEqual([]);
    });
  });
});
