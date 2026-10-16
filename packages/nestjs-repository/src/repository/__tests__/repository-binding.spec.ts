import { type PlainLiteralObject } from '@nestjs/common';

import { RepositoryBootException } from '../../exceptions/repository-boot.exception.js';
import { RepositoryUnboundException } from '../../exceptions/repository-unbound.exception.js';
import { RowScopeBootException } from '../../row-scope/exceptions/row-scope-boot.exception.js';
import { RowScopeUnboundException } from '../../row-scope/exceptions/row-scope-unbound.exception.js';
import {
  type RowScopeInterface,
  type RowScopeQueryParams,
  type RowScopeWriteParams,
} from '../../row-scope/interfaces/row-scope.interface.js';
import { type WhereClause } from '../interfaces/where-clause.interface.js';

import {
  type TestEntity,
  TestRepositoryAdapter,
} from './fixtures/test-repository-adapter.fixture.js';

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

const row: TestEntity = {
  id: 'a',
  name: 'row',
  version: 1,
  dateDeleted: null,
};

const operations: [
  string,
  (repo: TestRepositoryAdapter) => Promise<unknown>,
][] = [
  ['find', (repo) => repo.find()],
  ['findOne', (repo) => repo.findOne({})],
  ['count', (repo) => repo.count()],
  ['findAndCount', (repo) => repo.findAndCount()],
  ['create', (repo) => repo.create({ name: 'new' })],
  ['createMany', (repo) => repo.createMany([{ name: 'new' }])],
  ['update', (repo) => repo.update(row, { name: 'changed' })],
  ['upsert', (repo) => repo.upsert({ id: 'a', name: 'changed' })],
  ['replace', (repo) => repo.replace(row, { name: 'changed' })],
  ['delete', (repo) => repo.delete(row)],
  ['deleteMany', (repo) => repo.deleteMany([row])],
  ['softDelete', (repo) => repo.softDelete(row)],
  ['restore', (repo) => repo.restore(row)],
];

describe('repository binding', () => {
  it.each(operations)(
    'refuses %s on a repository that was never bound',
    async (_name, call) => {
      await expect(call(new TestRepositoryAdapter('rows'))).rejects.toThrow(
        RepositoryUnboundException,
      );
    },
  );

  it('binds once', () => {
    const repo = new TestRepositoryAdapter('rows');
    repo.bind({});

    expect(() => repo.bind({})).toThrow(RepositoryBootException);
  });

  it('refuses a resolver before the entity is bound as scoped', () => {
    const repo = new TestRepositoryAdapter('rows');

    expect(() => repo.setRowScopeResolver(new Resolver())).toThrow(
      RowScopeBootException,
    );
  });

  it('refuses a resolver for an entity bound as public', () => {
    const repo = new TestRepositoryAdapter('rows');
    repo.bind({ rowScope: { access: 'public', reason: 'shared' } });

    expect(() => repo.setRowScopeResolver(new Resolver())).toThrow(
      RowScopeBootException,
    );
  });

  it('scopes a scoped entity once its resolver is attached', async () => {
    const repo = new TestRepositoryAdapter('rows');
    repo.bind({ rowScope: { access: 'scoped', resolver: Resolver } });

    await expect(repo.count()).rejects.toThrow(RowScopeUnboundException);

    const resolver = new Resolver();
    const scopeQuery = vi.spyOn(resolver, 'scopeQuery');
    repo.setRowScopeResolver(resolver);
    await repo.count().catch(() => undefined);

    expect(scopeQuery).toHaveBeenCalledTimes(1);
  });

  it('attaches a resolver once', () => {
    const repo = new TestRepositoryAdapter('rows');
    repo.bind({ rowScope: { access: 'scoped', resolver: Resolver } });
    repo.setRowScopeResolver(new Resolver());

    expect(() => repo.setRowScopeResolver(new Resolver())).toThrow(
      RowScopeBootException,
    );
  });
});
