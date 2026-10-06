import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import { type RepositoryRelationMetadataInterface } from '../../repository/interfaces/repository-relation-metadata.interface.js';
import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import { RepositoryAdapter } from '../../repository/repository-adapter.js';
import {
  type RowScopeInterface,
  type RowScopeQueryParams,
  type RowScopeWriteParams,
} from '../interfaces/row-scope.interface.js';
import {
  checkDeclarationCompleteness,
  checkResolversBound,
} from '../row-scope-boot-checks.js';

class Resolver implements RowScopeInterface {
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

class EntityClass {}

/**
 * Structural only — these checks never execute an operation, so every `do*`
 * here exists to satisfy the abstract contract and nothing more.
 */
class StubAdapter extends RepositoryAdapter<PlainLiteralObject> {
  readonly metadata: RepositoryMetadataInterface<PlainLiteralObject>;

  constructor(
    entityKey: string,
    entityName: string,
    declaration?: ConstructorParameters<typeof RepositoryAdapter>[2],
    relations: RepositoryRelationMetadataInterface[] = [],
  ) {
    super(entityKey, undefined, declaration);
    this.metadata = {
      name: entityName,
      type: EntityClass as Type<PlainLiteralObject>,
      columns: [],
      relations,
    };
  }

  protected async doFind(): Promise<PlainLiteralObject[]> {
    throw new Error('structural check only');
  }
  protected async doFindOne(): Promise<PlainLiteralObject | null> {
    throw new Error('structural check only');
  }
  protected async doCount(): Promise<number> {
    throw new Error('structural check only');
  }
  protected async doFindAndCount(): Promise<[PlainLiteralObject[], number]> {
    throw new Error('structural check only');
  }
  protected async doCreate(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  protected async doCreateMany(): Promise<PlainLiteralObject[]> {
    throw new Error('structural check only');
  }
  protected async doUpdate(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  protected async doUpsert(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  protected async doReplace(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  protected async doDelete(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  protected async doDeleteMany(): Promise<PlainLiteralObject[]> {
    throw new Error('structural check only');
  }
  protected async doSoftDelete(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  protected async doRestore(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  transform(entityLike: DeepPartial<PlainLiteralObject>): PlainLiteralObject {
    return entityLike;
  }
  merge(mergeInto: PlainLiteralObject): PlainLiteralObject {
    return mergeInto;
  }
}

const scoped = { access: 'scoped', resolver: Resolver } as const;
const publicly = { access: 'public', reason: 'shared reference data' } as const;

const boundScoped = (entityKey: string, entityName: string): StubAdapter => {
  const adapter = new StubAdapter(entityKey, entityName, scoped);
  adapter.setRowScope(new Resolver());
  return adapter;
};

describe('row scope boot checks', () => {
  describe('resolvers bound', () => {
    it('passes when a scoped entity has its resolver bound', () => {
      expect(checkResolversBound([boundScoped('a', 'A')])).toEqual([]);
    });

    it('fails when a scoped entity was never bound', () => {
      const failures = checkResolversBound([new StubAdapter('a', 'A', scoped)]);

      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain('"a"');
    });

    it('ignores entities that are declared public or not declared at all', () => {
      expect(
        checkResolversBound([
          new StubAdapter('a', 'A', publicly),
          new StubAdapter('b', 'B'),
        ]),
      ).toEqual([]);
    });
  });

  describe('declaration completeness', () => {
    it('passes when every entity is declared', () => {
      expect(
        checkDeclarationCompleteness([
          new StubAdapter('a', 'A', scoped),
          new StubAdapter('b', 'B', publicly),
        ]),
      ).toEqual([]);
    });

    it('fails an entity with no declaration', () => {
      const failures = checkDeclarationCompleteness([
        new StubAdapter('a', 'A'),
      ]);

      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain('"a"');
    });
  });
});
