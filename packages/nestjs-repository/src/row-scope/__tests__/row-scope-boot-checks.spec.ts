import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { targetColumnsFixture } from '../../__fixtures__/column-metadata.fixture.js';
import { FederationReader } from '../../federation/federation-reader.service.js';
import { type RepositoryFederationBinding } from '../../repository/interfaces/repository-binding.interface.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import { type RepositoryRelationMetadataInterface } from '../../repository/interfaces/repository-relation-metadata.interface.js';
import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import { RepositoryAdapter } from '../../repository/repository-adapter.js';
import { RepositoryRegistryService } from '../../services/repository-registry.service.js';
import { type RowScopeRegistration } from '../interfaces/row-scope-registration.interface.js';
import {
  type RowScopeInterface,
  type RowScopeQueryParams,
  type RowScopeWriteParams,
} from '../interfaces/row-scope.interface.js';
import {
  checkDeclarationCompleteness,
  checkRelationsIntoScoped,
  findRelationsIntoScoped,
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
    declaration?: RowScopeRegistration,
    relations: RepositoryRelationMetadataInterface[] = [],
    urn = `urn:memory:${entityName}`,
    federation?: RepositoryFederationBinding,
  ) {
    super(entityKey);
    this.bind({ rowScope: declaration, federation });
    this.metadata = {
      name: entityName,
      type: EntityClass as Type<PlainLiteralObject>,
      urn,
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
  toRow(entityLike: DeepPartial<PlainLiteralObject>): PlainLiteralObject {
    return entityLike;
  }
}

const scoped = { access: 'scoped', resolver: Resolver } as const;
const publicly = { access: 'public', reason: 'shared reference data' } as const;

const boundScoped = (entityKey: string, entityName: string): StubAdapter => {
  const adapter = new StubAdapter(entityKey, entityName, scoped);
  adapter.setRowScopeResolver(new Resolver());
  return adapter;
};

describe('row scope boot checks', () => {
  describe('relations into a scoped entity', () => {
    const toScoped = (
      name: string,
      flags: Partial<RepositoryRelationMetadataInterface> = {},
    ): RepositoryRelationMetadataInterface => ({
      name,
      targetEntity: 'Order',
      targetUrn: 'urn:memory:Order',
      targetColumns: targetColumnsFixture('id', 'categoryId'),
      cardinality: 'many',
      on: { from: 'id', to: 'categoryId' },
      ...flags,
    });

    it.each([
      ['declared public', publicly],
      ['not declared', undefined],
    ])('fails a relation from an entity %s', (_case, declaration) => {
      const failures = checkRelationsIntoScoped([
        boundScoped('orders', 'Order'),
        new StubAdapter('categories', 'Category', declaration, [
          toScoped('orders'),
        ]),
      ]);

      expect(failures).toEqual([
        '"categories" has no row scope, but its "orders" relation points at ' +
          'Order, which does. Reading "orders" would return Order rows the ' +
          'caller is not allowed to see. Give "categories" a row scope in ' +
          'forRoot(), or remove "orders" from the entity and declare the ' +
          "relation on Order's side only.",
      ]);
    });

    it('allows a federated relation, read through its own repository', () => {
      const relation = toScoped('orders');
      const failures = checkRelationsIntoScoped([
        boundScoped('orders', 'Order'),
        new StubAdapter(
          'categories',
          'Category',
          publicly,
          [relation],
          undefined,
          {
            reader: new FederationReader(new RepositoryRegistryService()),
            relations: new Map([['orders', { relation }]]),
            maxKeys: 10,
          },
        ),
      ]);

      expect(failures).toEqual([]);
    });

    it('fails an owning relation as well as an inverse one', () => {
      const failures = checkRelationsIntoScoped([
        boundScoped('orders', 'Order'),
        new StubAdapter('notes', 'Note', publicly, [
          toScoped('order', {
            cardinality: 'one',
            on: { from: 'orderId', to: 'id' },
            foreignKey: [{ from: 'orderId', to: 'id' }],
          }),
        ]),
      ]);

      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain('"order" relation');
    });

    it('fails a relation into rows a differently named scoped entity reads', () => {
      // Two classes over one table, e.g. a single-table inheritance child
      // registered scoped and its parent reachable by relation.
      const invoices = new StubAdapter(
        'invoices',
        'Invoice',
        scoped,
        [],
        'urn:memory:documents',
      );
      invoices.setRowScopeResolver(new Resolver());

      const failures = checkRelationsIntoScoped([
        invoices,
        new StubAdapter('folders', 'Folder', publicly, [
          toScoped('documents', {
            targetEntity: 'Document',
            targetUrn: 'urn:memory:documents',
          }),
        ]),
      ]);

      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain('points at Document');
    });

    it('passes a relation into a same-named entity that reads other rows', () => {
      // Same class name, another data source.
      const failures = checkRelationsIntoScoped([
        boundScoped('orders', 'Order'),
        new StubAdapter('categories', 'Category', publicly, [
          toScoped('orders', { targetUrn: 'urn:memory:archive:Order' }),
        ]),
      ]);

      expect(failures).toEqual([]);
    });

    it('fails a many-to-many whose junction rows are scoped', () => {
      const failures = checkRelationsIntoScoped([
        boundScoped('assignments', 'Assignment'),
        new StubAdapter('users', 'User', publicly, [
          toScoped('roles', {
            targetEntity: 'Role',
            targetUrn: 'urn:memory:Role',
            on: { from: 'id', to: 'id' },
            through: {
              urn: 'urn:memory:Assignment',
              fromKey: 'userId',
              toKey: 'roleId',
            },
          }),
        ]),
      ]);

      expect(failures).toEqual([
        '"users" has no row scope, but its "roles" relation reads through the ' +
          'rows of "assignments", which has one. Reading "roles" would follow ' +
          'links the caller is not allowed to see. Give "users" a row scope ' +
          'in forRoot(), or remove "roles" from the entity.',
      ]);
    });

    it('passes relations between two scoped or two unscoped entities', () => {
      const adapters = [
        boundScoped('orders', 'Order'),
        new StubAdapter('lines', 'OrderLine', scoped, [toScoped('order')]),
        new StubAdapter('tags', 'Tag', publicly, [
          toScoped('categories', {
            targetEntity: 'Category',
            targetUrn: 'urn:memory:Category',
          }),
        ]),
        new StubAdapter('categories', 'Category'),
      ];

      expect(checkRelationsIntoScoped(adapters)).toEqual([]);
    });
  });

  describe('which relations read scoped rows', () => {
    const relation = (
      name: string,
      targetUrn: string,
      junctionUrn?: string,
    ): RepositoryRelationMetadataInterface => ({
      name,
      targetEntity: 'Target',
      targetUrn,
      targetColumns: targetColumnsFixture('id'),
      cardinality: 'many',
      on: { from: 'id', to: 'id' },
      ...(junctionUrn && {
        through: { urn: junctionUrn, fromKey: 'aId', toKey: 'bId' },
      }),
    });

    it('names a relation into scoped rows, or through scoped junction rows', () => {
      const adapter = new StubAdapter('users', 'User', scoped, [
        relation('orders', 'urn:memory:Order'),
        relation('roles', 'urn:memory:Role', 'urn:memory:Assignment'),
        relation('tags', 'urn:memory:Tag', 'urn:memory:UserTag'),
      ]);

      expect(
        findRelationsIntoScoped(
          adapter.metadata,
          new Set(['urn:memory:Order', 'urn:memory:Assignment']),
        ),
      ).toEqual(['orders', 'roles']);
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
