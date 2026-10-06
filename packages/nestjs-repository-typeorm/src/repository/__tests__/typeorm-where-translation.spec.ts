import {
  And,
  Between,
  Equal,
  type FindOperator,
  type FindOptionsWhere,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Not,
  type Repository,
} from 'typeorm';

import { RuntimeException } from '@concepta/nestjs-core';
import {
  type JoinClause,
  Where,
  type WhereClause,
  type WhereCondition,
  type WhereOperator,
} from '@concepta/nestjs-repository';

import { TypeOrmRepository } from '../typeorm-repository.js';

interface TestEntity {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
}

class TestEntityClass {
  id!: string;
  firstName!: string;
  lastName!: string;
  age!: number;
}

/**
 * Subclass that exposes protected translation methods for unit testing.
 */
class TestableTypeOrmRepository extends TypeOrmRepository<TestEntity> {
  public testToFindOperator(cond: WhereCondition) {
    return this.toFindOperator(cond);
  }

  public testBranchToFindOptionsWhere(leaves: WhereClause[]) {
    return this.branchToFindOptionsWhere(leaves);
  }

  public testTranslateWhere(clause?: WhereClause) {
    return this.translateWhere(clause);
  }

  public testTranslateJoin(join?: JoinClause[]) {
    return this.translateJoin(join);
  }

  public testNeverWhere() {
    return this.neverWhere();
  }
}

// Raw()'s FindOperator carries the sql-generator closure itself, so two
// separately-constructed never-where predicates are never `toEqual` —
// assert shape instead of comparing against a second Raw() call.
function expectNeverWhere(result: FindOptionsWhere<TestEntity>[] | undefined) {
  expect(result).toHaveLength(1);
  const branch = (result ?? [])[0] as Record<string, FindOperator<unknown>>;
  expect(Object.keys(branch)).toEqual(['id']);
  expect(branch.id.type).toBe('raw');
  expect(branch.id.getSql?.('t')).toBe('1 = 0');
}

function createTestableRepo(): TestableTypeOrmRepository {
  const mockRepo = {
    metadata: {
      name: 'TestEntity',
      targetName: 'TestEntity',
      columns: [
        {
          propertyName: 'id',
          isPrimary: true,
          isDeleteDate: false,
          isVersion: false,
        },
        {
          propertyName: 'firstName',
          isPrimary: false,
          isDeleteDate: false,
          isVersion: false,
        },
        {
          propertyName: 'lastName',
          isPrimary: false,
          isDeleteDate: false,
          isVersion: false,
        },
        {
          propertyName: 'age',
          isPrimary: false,
          isDeleteDate: false,
          isVersion: false,
        },
      ],
      relations: [],
    },
    target: TestEntityClass,
  } as unknown as Repository<TestEntity>;

  return new TestableTypeOrmRepository(mockRepo, { entityKey: 'test-entity' });
}

describe('TypeOrmRepository WHERE clause translation', () => {
  let repo: TestableTypeOrmRepository;

  beforeEach(() => {
    repo = createTestableRepo();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // toFindOperator — all 17 operator cases
  // ═════════════════════════════════════════════════════════════════════════════

  describe('toFindOperator', () => {
    it('should translate EQ to Equal', () => {
      const result = repo.testToFindOperator(
        Where.eq<TestEntity>('firstName', 'John'),
      );
      expect(result).toEqual(Equal('John'));
    });

    it('should translate NE to Not(Equal)', () => {
      const result = repo.testToFindOperator(
        Where.ne<TestEntity>('firstName', 'John'),
      );
      expect(result).toEqual(Not(Equal('John')));
    });

    it('should translate GT to MoreThan', () => {
      const result = repo.testToFindOperator(Where.gt<TestEntity>('age', 18));
      expect(result).toEqual(MoreThan(18));
    });

    it('should translate GTE to MoreThanOrEqual', () => {
      const result = repo.testToFindOperator(Where.gte<TestEntity>('age', 18));
      expect(result).toEqual(MoreThanOrEqual(18));
    });

    it('should translate LT to LessThan', () => {
      const result = repo.testToFindOperator(Where.lt<TestEntity>('age', 65));
      expect(result).toEqual(LessThan(65));
    });

    it('should translate LTE to LessThanOrEqual', () => {
      const result = repo.testToFindOperator(Where.lte<TestEntity>('age', 65));
      expect(result).toEqual(LessThanOrEqual(65));
    });

    it('should translate CONTAINS to Like(%value%)', () => {
      const result = repo.testToFindOperator(
        Where.contains<TestEntity>('firstName', 'oh'),
      );
      expect(result).toEqual(Like('%oh%'));
    });

    it('should translate NCONTAINS to Not(Like(%value%))', () => {
      const result = repo.testToFindOperator(
        Where.notContains<TestEntity>('firstName', 'oh'),
      );
      expect(result).toEqual(Not(Like('%oh%')));
    });

    it('should translate STARTS to Like(value%)', () => {
      const result = repo.testToFindOperator(
        Where.starts<TestEntity>('firstName', 'Jo'),
      );
      expect(result).toEqual(Like('Jo%'));
    });

    it('should translate NSTARTS to Not(Like(value%))', () => {
      const result = repo.testToFindOperator(
        Where.notStarts<TestEntity>('firstName', 'Jo'),
      );
      expect(result).toEqual(Not(Like('Jo%')));
    });

    it('should translate ENDS to Like(%value)', () => {
      const result = repo.testToFindOperator(
        Where.ends<TestEntity>('firstName', 'hn'),
      );
      expect(result).toEqual(Like('%hn'));
    });

    it('should translate NENDS to Not(Like(%value))', () => {
      const result = repo.testToFindOperator(
        Where.notEnds<TestEntity>('firstName', 'hn'),
      );
      expect(result).toEqual(Not(Like('%hn')));
    });

    it('should translate IN to In', () => {
      const result = repo.testToFindOperator(
        Where.in<TestEntity>('firstName', ['John', 'Jane']),
      );
      expect(result).toEqual(In(['John', 'Jane']));
    });

    it('should translate NIN to Not(In)', () => {
      const result = repo.testToFindOperator(
        Where.notIn<TestEntity>('firstName', ['John', 'Jane']),
      );
      expect(result).toEqual(Not(In(['John', 'Jane'])));
    });

    it('should translate IS_NULL to IsNull', () => {
      const result = repo.testToFindOperator(
        Where.isNull<TestEntity>('lastName'),
      );
      expect(result).toEqual(IsNull());
    });

    it('should translate NOT_NULL to Not(IsNull)', () => {
      const result = repo.testToFindOperator(
        Where.notNull<TestEntity>('lastName'),
      );
      expect(result).toEqual(Not(IsNull()));
    });

    it('should translate BETWEEN to Between', () => {
      const result = repo.testToFindOperator(
        Where.between<TestEntity>('age', 18, 65),
      );
      expect(result).toEqual(Between(18, 65));
    });

    it('should throw on unknown operator', () => {
      const cond = {
        field: 'firstName',
        operator: 'unknown_op' as WhereOperator,
        value: 'test',
      } as WhereCondition;

      expect(() => repo.testToFindOperator(cond)).toThrow();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // branchToFindOptionsWhere
  // ═════════════════════════════════════════════════════════════════════════════

  describe('branchToFindOptionsWhere', () => {
    it('should convert a single field condition', () => {
      const leaves: WhereClause[] = [Where.eq<TestEntity>('firstName', 'John')];
      const result = repo.testBranchToFindOptionsWhere(leaves);
      expect(result).toEqual({ firstName: Equal('John') });
    });

    it('should convert multiple different field conditions', () => {
      const leaves: WhereClause[] = [
        Where.eq<TestEntity>('firstName', 'John'),
        Where.gt<TestEntity>('age', 18),
      ];
      const result = repo.testBranchToFindOptionsWhere(leaves);
      expect(result).toEqual({
        firstName: Equal('John'),
        age: MoreThan(18),
      });
    });

    it('should merge same-field conditions with And', () => {
      const leaves: WhereClause[] = [
        Where.gte<TestEntity>('age', 18),
        Where.lte<TestEntity>('age', 65),
      ];
      const result = repo.testBranchToFindOptionsWhere(leaves);
      expect(result).toEqual({
        age: And(MoreThanOrEqual(18), LessThanOrEqual(65)),
      });
    });

    it('should nest relation-tagged conditions under relation key', () => {
      const leaves: WhereClause[] = [
        Where.rel('posts', Where.eq<TestEntity>('id', '123')),
      ];
      const result = repo.testBranchToFindOptionsWhere(leaves);
      expect(result).toEqual({
        posts: { id: Equal('123') },
      });
    });

    it('should merge same-field conditions within a relation', () => {
      const leaves: WhereClause[] = [
        Where.rel('posts', Where.gte<TestEntity>('age', 1)),
        Where.rel('posts', Where.lte<TestEntity>('age', 100)),
      ];
      const result = repo.testBranchToFindOptionsWhere(leaves);
      expect(result).toEqual({
        posts: { age: And(MoreThanOrEqual(1), LessThanOrEqual(100)) },
      });
    });

    it('should handle mixed field and relation conditions', () => {
      const leaves: WhereClause[] = [
        Where.eq<TestEntity>('firstName', 'John'),
        Where.rel('posts', Where.eq<TestEntity>('id', 'abc')),
      ];
      const result = repo.testBranchToFindOptionsWhere(leaves);
      expect(result).toEqual({
        firstName: Equal('John'),
        posts: { id: Equal('abc') },
      });
    });

    it('should handle multiple distinct relations', () => {
      const leaves: WhereClause[] = [
        Where.rel('posts', Where.eq<TestEntity>('firstName', 'Draft')),
        Where.rel('comments', Where.gt<TestEntity>('age', 5)),
      ];
      const result = repo.testBranchToFindOptionsWhere(leaves);
      expect(result).toEqual({
        posts: { firstName: Equal('Draft') },
        comments: { age: MoreThan(5) },
      });
    });

    it('should return empty object for empty leaves', () => {
      const result = repo.testBranchToFindOptionsWhere([]);
      expect(result).toEqual({});
    });

    it('should skip compound nodes (non-conditions)', () => {
      const leaves: WhereClause[] = [
        Where.and(Where.eq<TestEntity>('firstName', 'John')),
      ];
      const result = repo.testBranchToFindOptionsWhere(leaves);
      expect(result).toEqual({});
    });

    it('should throw for a never leaf — unreachable via translateWhere, a defensive guard against a broken toDnf invariant silently widening to "no constraint"', () => {
      expect(() => repo.testBranchToFindOptionsWhere([Where.never()])).toThrow(
        RuntimeException,
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // neverWhere
  // ═════════════════════════════════════════════════════════════════════════════

  describe('neverWhere', () => {
    it('should anchor on the primary column and render a literal always-false predicate', () => {
      expectNeverWhere([repo.testNeverWhere()]);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // translateWhere
  // ═════════════════════════════════════════════════════════════════════════════

  describe('translateWhere', () => {
    it('should return undefined for undefined input', () => {
      expect(repo.testTranslateWhere(undefined)).toEqual(undefined);
    });

    it('should translate a single condition to single-element array', () => {
      const clause = Where.eq<TestEntity>('firstName', 'John');
      expect(repo.testTranslateWhere(clause)).toEqual([
        { firstName: Equal('John') },
      ]);
    });

    it('should translate AND compound to single element with merged conditions', () => {
      const clause = Where.and(
        Where.eq<TestEntity>('firstName', 'John'),
        Where.gt<TestEntity>('age', 18),
      );
      expect(repo.testTranslateWhere(clause)).toEqual([
        { firstName: Equal('John'), age: MoreThan(18) },
      ]);
    });

    it('should translate OR compound to multiple elements', () => {
      const clause = Where.or(
        Where.eq<TestEntity>('firstName', 'John'),
        Where.eq<TestEntity>('firstName', 'Jane'),
      );
      expect(repo.testTranslateWhere(clause)).toEqual([
        { firstName: Equal('John') },
        { firstName: Equal('Jane') },
      ]);
    });

    it('should distribute AND over OR into DNF', () => {
      const clause = Where.and(
        Where.or(
          Where.eq<TestEntity>('firstName', 'John'),
          Where.eq<TestEntity>('firstName', 'Jane'),
        ),
        Where.gt<TestEntity>('age', 18),
      );
      expect(repo.testTranslateWhere(clause)).toEqual([
        { firstName: Equal('John'), age: MoreThan(18) },
        { firstName: Equal('Jane'), age: MoreThan(18) },
      ]);
    });

    it('should handle nested AND within OR', () => {
      const clause = Where.or(
        Where.and(
          Where.eq<TestEntity>('firstName', 'John'),
          Where.gt<TestEntity>('age', 18),
        ),
        Where.and(
          Where.eq<TestEntity>('firstName', 'Jane'),
          Where.lt<TestEntity>('age', 30),
        ),
      );
      expect(repo.testTranslateWhere(clause)).toEqual([
        { firstName: Equal('John'), age: MoreThan(18) },
        { firstName: Equal('Jane'), age: LessThan(30) },
      ]);
    });

    it('should merge same field in AND branch with And()', () => {
      const clause = Where.and(
        Where.gte<TestEntity>('age', 18),
        Where.lte<TestEntity>('age', 65),
      );
      expect(repo.testTranslateWhere(clause)).toEqual([
        { age: And(MoreThanOrEqual(18), LessThanOrEqual(65)) },
      ]);
    });

    it('should handle relation-tagged conditions', () => {
      const clause = Where.and(
        Where.eq<TestEntity>('firstName', 'John'),
        Where.rel('posts', Where.eq<TestEntity>('id', 'abc')),
      );
      expect(repo.testTranslateWhere(clause)).toEqual([
        { firstName: Equal('John'), posts: { id: Equal('abc') } },
      ]);
    });

    it('should render Where.never() as neverWhere(), not an empty/undefined where', () => {
      expectNeverWhere(repo.testTranslateWhere(Where.never()));
    });

    it('should render AND(x, never) as neverWhere() — never short-circuits the whole clause', () => {
      const clause = Where.and(
        Where.eq<TestEntity>('firstName', 'John'),
        Where.never(),
      );
      expectNeverWhere(repo.testTranslateWhere(clause));
    });

    it('should drop a never branch out of an OR, keeping the satisfiable branch', () => {
      const clause = Where.or(
        Where.never(),
        Where.eq<TestEntity>('firstName', 'John'),
      );
      expect(repo.testTranslateWhere(clause)).toEqual([
        { firstName: Equal('John') },
      ]);
    });

    it('should render an empty Where.or() as neverWhere()', () => {
      expectNeverWhere(repo.testTranslateWhere(Where.or()));
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // translateJoin
  // ═════════════════════════════════════════════════════════════════════════════

  describe('translateJoin', () => {
    it('should return undefined for undefined input', () => {
      expect(repo.testTranslateJoin(undefined)).toEqual(undefined);
    });

    it('should return undefined for empty array', () => {
      expect(repo.testTranslateJoin([])).toEqual(undefined);
    });

    it('should translate a single join', () => {
      const joins: JoinClause[] = [{ relation: 'posts' }];
      expect(repo.testTranslateJoin(joins)).toEqual({ posts: true });
    });

    it('should translate an explicit LEFT join', () => {
      const joins: JoinClause[] = [{ relation: 'posts', joinType: 'LEFT' }];
      expect(repo.testTranslateJoin(joins)).toEqual({ posts: true });
    });

    it('should refuse an INNER join rather than silently widening it', () => {
      // TypeORM's `relations` option is always a LEFT JOIN, so honouring this
      // is impossible here. Returning LEFT anyway would hand back rows the
      // caller asked to exclude — a wrong answer is worse than an error.
      const joins: JoinClause[] = [{ relation: 'company', joinType: 'INNER' }];

      expect(() => repo.testTranslateJoin(joins)).toThrow(/company/);
      expect(() => repo.testTranslateJoin(joins)).toThrow(
        /INNER joins are not supported/,
      );
    });

    it('should translate multiple joins', () => {
      const joins: JoinClause[] = [
        { relation: 'posts' },
        { relation: 'comments' },
      ];
      expect(repo.testTranslateJoin(joins)).toEqual({
        posts: true,
        comments: true,
      });
    });

    it('should deduplicate same relation', () => {
      const joins: JoinClause[] = [
        { relation: 'posts' },
        { relation: 'posts' },
      ];
      expect(repo.testTranslateJoin(joins)).toEqual({ posts: true });
    });
  });
});
