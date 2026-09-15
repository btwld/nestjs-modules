import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { type JoinClause } from '../../interfaces/join-clause.interface.js';
import { type RepositoryMetadataInterface } from '../../interfaces/repository-metadata.interface.js';
import {
  type RepositoryFindOptions,
  type RepositoryFindOneOptions,
  type RepositoryCreateOptions,
  type RepositoryUpdateOptions,
  type RepositoryUpsertOptions,
  type RepositoryDeleteOptions,
  type RepositoryDeleteOneOptions,
  type RepositoryRestoreOptions,
} from '../../interfaces/repository-options.interface.js';
import { type WhereClause } from '../../interfaces/where-clause.interface.js';
import { RepositoryAdapter } from '../../repository-adapter.js';

// ─── Test entity ─────────────────────────────────────────────────────────────

export interface TestEntity extends PlainLiteralObject {
  id: string;
  name: string;
  version: number;
  dateDeleted: Date | null;
}

export class TestEntityClass {
  declare id: string;
  declare name: string;
  declare version: number;
  declare dateDeleted: Date | null;
}

// ─── Concrete subclass to expose protected methods ───────────────────────────

export class TestRepositoryAdapter extends RepositoryAdapter<TestEntity> {
  // Structurally required: RepositoryMetadataInterface's `type: Type<Entity>`
  // needs assignability to PlainLiteralObject (Record<string, unknown>), which
  // a concrete class never satisfies without an index signature.
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
      {
        name: 'dateDeleted',
        isPrimary: false,
        isRemoveDate: true,
        isVersion: false,
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
    _options?: RepositoryUpdateOptions<TestEntity>,
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
    _options?: RepositoryUpdateOptions<TestEntity>,
  ): Promise<TestEntity> {
    throw new Error('not implemented');
  }
  protected doDelete(
    _entity: TestEntity,
    _options?: RepositoryDeleteOneOptions<TestEntity>,
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
    _options?: RepositoryDeleteOneOptions<TestEntity>,
  ): Promise<TestEntity> {
    throw new Error('not implemented');
  }
  protected doRestore(
    _entity: TestEntity,
    _options?: RepositoryRestoreOptions<TestEntity>,
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

  exposedGetDeleteDateColumn(): (keyof TestEntity & string) | undefined {
    return this.getDeleteDateColumn();
  }
}

// ─── Version-less variant ─────────────────────────────────────────────────────
//
// Same entity shape, but no column is marked `isVersion` — for asserting the
// behavior of an entity that has no optimistic-locking support at all.

export class TestRepositoryAdapterNoVersion extends TestRepositoryAdapter {
  readonly metadata: RepositoryMetadataInterface<TestEntity> = {
    ...this.metadata,
    columns: this.metadata.columns.map((col) => ({ ...col, isVersion: false })),
  };
}

// ─── Tracking subclass ──────────────────────────────────────────────────────
//
// The base fixture's `doX` methods throw 'not implemented', which already
// proves a guard fired before delegation (a different error than a guard
// exception would surface). This subclass additionally makes them succeed,
// tracking call counts and the options each call received, so the allowed
// paths (`{ force: true }`, a matching `expectedVersion`, live entities, no
// existing row) can assert a write actually went through with the right
// options.
export class TrackingTestRepositoryAdapter extends TestRepositoryAdapter {
  doUpdateCalls = 0;
  doReplaceCalls = 0;
  doUpsertCalls = 0;
  doDeleteCalls = 0;
  doSoftDeleteCalls = 0;
  doRestoreCalls = 0;
  doFindOneCalls: RepositoryFindOneOptions<TestEntity>[] = [];
  findOneResult: TestEntity | null = null;

  lastUpdateOptions?: RepositoryUpdateOptions<TestEntity>;
  lastReplaceOptions?: RepositoryUpdateOptions<TestEntity>;
  lastDeleteOptions?: RepositoryDeleteOneOptions<TestEntity>;
  lastSoftDeleteOptions?: RepositoryDeleteOneOptions<TestEntity>;
  lastRestoreOptions?: RepositoryRestoreOptions<TestEntity>;

  protected override doUpdate(
    entity: TestEntity,
    data: DeepPartial<TestEntity>,
    options?: RepositoryUpdateOptions<TestEntity>,
  ): Promise<TestEntity> {
    this.doUpdateCalls++;
    this.lastUpdateOptions = options;
    return Promise.resolve(mergeEntity(entity, data));
  }

  protected override doReplace(
    entity: TestEntity,
    data: DeepPartial<TestEntity>,
    options?: RepositoryUpdateOptions<TestEntity>,
  ): Promise<TestEntity> {
    this.doReplaceCalls++;
    this.lastReplaceOptions = options;
    return Promise.resolve(mergeEntity(entity, data));
  }

  protected override doUpsert(
    entity: DeepPartial<TestEntity>,
  ): Promise<TestEntity> {
    this.doUpsertCalls++;
    return Promise.resolve(this.prepare(entity) ?? new TestEntityClass());
  }

  protected override doDelete(
    entity: TestEntity,
    options?: RepositoryDeleteOneOptions<TestEntity>,
  ): Promise<TestEntity> {
    this.doDeleteCalls++;
    this.lastDeleteOptions = options;
    return Promise.resolve(entity);
  }

  protected override doSoftDelete(
    entity: TestEntity,
    options?: RepositoryDeleteOneOptions<TestEntity>,
  ): Promise<TestEntity> {
    this.doSoftDeleteCalls++;
    this.lastSoftDeleteOptions = options;
    return Promise.resolve({ ...entity, dateDeleted: new Date() });
  }

  protected override doRestore(
    entity: TestEntity,
    options?: RepositoryRestoreOptions<TestEntity>,
  ): Promise<TestEntity> {
    this.doRestoreCalls++;
    this.lastRestoreOptions = options;
    return Promise.resolve({ ...entity, dateDeleted: null });
  }

  protected override doFindOne(
    options: RepositoryFindOneOptions<TestEntity>,
  ): Promise<TestEntity | null> {
    this.doFindOneCalls.push(options);
    return Promise.resolve(this.findOneResult);
  }
}

// Same tracking behavior, but on the version-less metadata — for asserting
// that update/replace never receive a versionGuard when the entity has no
// version column.
export class TrackingTestRepositoryAdapterNoVersion extends TrackingTestRepositoryAdapter {
  readonly metadata: RepositoryMetadataInterface<TestEntity> = {
    ...this.metadata,
    columns: this.metadata.columns.map((col) => ({ ...col, isVersion: false })),
  };
}

// A plain `{ ...entity, ...data }` spread widens `dateDeleted` to
// `DeepPartial<Date>` (an object with every `Date` method optional), since
// `data` is typed `DeepPartial<TestEntity>` — this merges by field instead
// so the mocked `doUpdate`/`doReplace` stay `TestEntity`-typed.
export function mergeEntity(
  entity: TestEntity,
  data: DeepPartial<TestEntity>,
): TestEntity {
  const merged = new TestEntityClass();
  merged.id = entity.id;
  merged.name = data.name ?? entity.name;
  merged.version = entity.version;
  merged.dateDeleted = entity.dateDeleted;
  return merged;
}
