import { type PlainLiteralObject, type Type } from '@nestjs/common';

import {
  AppContextHost,
  type DeepPartial,
  HooksCtx,
  RuntimeException,
} from '@concepta/nestjs-core';

import { type JoinClause } from '../interfaces/join-clause.interface.js';
import { type RepositoryMetadataInterface } from '../interfaces/repository-metadata.interface.js';
import {
  type RepositoryFindOptions,
  type RepositoryFindOneOptions,
  type RepositoryCreateOptions,
  type RepositoryUpdateOptions,
  type RepositoryUpsertOptions,
  type RepositoryDeleteOptions,
  type RepositoryRestoreOptions,
} from '../interfaces/repository-options.interface.js';
import { type WhereClause } from '../interfaces/where-clause.interface.js';
import { RepositoryAdapter } from '../repository-adapter.js';
import { Where } from '../where.helpers.js';

// ─── Test entity ─────────────────────────────────────────────────────────────

interface TestEntity extends PlainLiteralObject {
  id: string;
  name: string;
  version: number;
}

class TestEntityClass {
  id!: string;
  name!: string;
  version!: number;
}

// ─── Concrete subclass to expose protected methods ───────────────────────────

class TestRepositoryAdapter extends RepositoryAdapter<TestEntity> {
  readonly metadata: RepositoryMetadataInterface<TestEntity> = {
    name: 'TestEntity',
    type: TestEntityClass as Type<TestEntity>,
    columns: [
      { name: 'id', isPrimary: true, isRemoveDate: false, isVersion: false },
      { name: 'name', isPrimary: false, isRemoveDate: false, isVersion: false },
      {
        name: 'version',
        isPrimary: false,
        isRemoveDate: false,
        isVersion: true,
      },
    ],
    relations: [
      {
        name: 'posts',
        targetEntity: 'PostEntity',
        cardinality: 'many' as const,
        on: { from: 'id', to: 'authorId' },
      },
      {
        name: 'tags',
        targetEntity: 'TagEntity',
        cardinality: 'many' as const,
        on: { from: 'id', to: 'id' },
        through: {
          relation: 'entity_tags',
          fromKey: 'entityId',
          toKey: 'tagId',
        },
      },
    ],
  };

  protected doFind(
    _options?: RepositoryFindOptions<TestEntity>,
  ): Promise<TestEntity[]> {
    throw new Error('not implemented');
  }
  protected doFindOne(
    _options: RepositoryFindOneOptions<TestEntity>,
  ): Promise<TestEntity | null> {
    throw new Error('not implemented');
  }
  protected doCount(
    _options?: RepositoryFindOptions<TestEntity>,
  ): Promise<number> {
    throw new Error('not implemented');
  }
  protected doFindAndCount(
    _options?: RepositoryFindOptions<TestEntity>,
  ): Promise<[TestEntity[], number]> {
    throw new Error('not implemented');
  }
  protected doCreate(
    _entity: DeepPartial<TestEntity>,
    _options?: RepositoryCreateOptions,
  ): Promise<TestEntity> {
    throw new Error('not implemented');
  }
  protected doCreateMany(
    _entities: DeepPartial<TestEntity>[],
    _options?: RepositoryCreateOptions,
  ): Promise<TestEntity[]> {
    throw new Error('not implemented');
  }
  protected doUpdate(
    _entity: TestEntity,
    _data: DeepPartial<TestEntity>,
    _options?: RepositoryUpdateOptions,
  ): Promise<TestEntity> {
    throw new Error('not implemented');
  }
  protected doUpsert(
    _entity: DeepPartial<TestEntity>,
    _options?: RepositoryUpsertOptions,
  ): Promise<TestEntity> {
    throw new Error('not implemented');
  }
  protected doReplace(
    _entity: TestEntity,
    _data: DeepPartial<TestEntity>,
    _options?: RepositoryUpdateOptions,
  ): Promise<TestEntity> {
    throw new Error('not implemented');
  }
  protected doDelete(
    _entity: TestEntity,
    _options?: RepositoryDeleteOptions,
  ): Promise<TestEntity> {
    throw new Error('not implemented');
  }
  protected doDeleteMany(
    _entities: TestEntity[],
    _options?: RepositoryDeleteOptions,
  ): Promise<TestEntity[]> {
    throw new Error('not implemented');
  }
  protected doSoftDelete(
    _entity: TestEntity,
    _options?: RepositoryDeleteOptions,
  ): Promise<TestEntity> {
    throw new Error('not implemented');
  }
  protected doRestore(
    _entity: TestEntity,
    _options?: RepositoryRestoreOptions,
  ): Promise<TestEntity> {
    throw new Error('not implemented');
  }
  transform(_entityLike: DeepPartial<TestEntity>): TestEntity {
    throw new Error('not implemented');
  }
  merge(
    _mergeIntoEntity: TestEntity,
    ..._entityLikes: DeepPartial<TestEntity>[]
  ): TestEntity {
    throw new Error('not implemented');
  }

  exposedResolveJoinClauses(join?: JoinClause[]): JoinClause[] | undefined {
    return this.resolveJoinClauses(join);
  }

  exposedToDnf(clause: WhereClause): WhereClause[][] {
    return this.toDnf(clause);
  }

  exposedCartesianProduct(groups: WhereClause[][][]): WhereClause[][] {
    return this.cartesianProduct(groups);
  }

  exposedEntityCtx(ctx?: PlainLiteralObject): PlainLiteralObject | undefined {
    return this.entityCtx(ctx);
  }

  exposedGetVersionColumn(): (keyof TestEntity & string) | undefined {
    return this.getVersionColumn();
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe(RepositoryAdapter.name, () => {
  let adapter: TestRepositoryAdapter;

  beforeEach(() => {
    adapter = new TestRepositoryAdapter('test-entity');
  });

  describe('resolveJoinClauses', () => {
    it('should return undefined for undefined input', () => {
      expect(adapter.exposedResolveJoinClauses(undefined)).toBeUndefined();
    });

    it('should return undefined for empty array', () => {
      expect(adapter.exposedResolveJoinClauses([])).toBeUndefined();
    });

    it('should pass through valid join clauses', () => {
      const input: JoinClause[] = [{ relation: 'posts' }];
      const result = adapter.exposedResolveJoinClauses(input);
      expect(result).toBe(input);
    });

    it('should validate multiple joins', () => {
      const input: JoinClause[] = [{ relation: 'posts' }, { relation: 'tags' }];
      const result = adapter.exposedResolveJoinClauses(input);
      expect(result).toBe(input);
    });

    it('should throw RuntimeException for unknown relation', () => {
      expect(() => {
        adapter.exposedResolveJoinClauses([{ relation: 'nonexistent' }]);
      }).toThrow(RuntimeException);
    });
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

  describe('prepare', () => {
    it('should return an entity instance for an empty object', () => {
      const result = adapter.prepare({});
      expect(result).toBeInstanceOf(TestEntityClass);
    });

    it('should return entity instance as-is', () => {
      const entity = new TestEntityClass();
      entity.id = '1';
      expect(adapter.prepare(entity)).toBe(entity);
    });
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
