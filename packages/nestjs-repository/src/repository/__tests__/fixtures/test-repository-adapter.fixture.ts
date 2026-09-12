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
  type RepositoryRestoreOptions,
} from '../../interfaces/repository-options.interface.js';
import { type WhereClause } from '../../interfaces/where-clause.interface.js';
import { RepositoryAdapter } from '../../repository-adapter.js';

// ─── Test entity ─────────────────────────────────────────────────────────────

export interface TestEntity extends PlainLiteralObject {
  id: string;
  name: string;
  version: number;
}

export class TestEntityClass {
  declare id: string;
  declare name: string;
  declare version: number;
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
