import { type DynamicModule, Module } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  type TestEntity,
  TestEntityClass,
  TestRepositoryAdapter,
} from '../../repository/__tests__/fixtures/test-repository-adapter.fixture.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import { RepositoryModule } from '../../repository.module.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';
import { AppendOnlyViolationException } from '../exceptions/append-only-violation.exception.js';
import { WritePolicyBootException } from '../exceptions/write-policy-boot.exception.js';

const APPEND_ONLY = {
  access: 'append-only',
  reason: 'financial lineage is retained',
} as const;

const row: TestEntity = {
  id: 'a',
  name: 'original',
  version: 1,
  dateDeleted: null,
};

/**
 * The fixture adapter without its soft-delete column, so an append-only
 * declaration on it passes the startup checks.
 */
class AppendableAdapter extends TestRepositoryAdapter {
  readonly metadata: RepositoryMetadataInterface<TestEntity> = {
    ...new TestRepositoryAdapter('template').metadata,
    columns: [
      { name: 'id', isPrimary: true, isRemoveDate: false, isVersion: false },
      { name: 'name', isPrimary: false, isRemoveDate: false, isVersion: false },
    ],
  };
}

/**
 * A driver that knows nothing about write policy: it builds each adapter from
 * the key alone and never reads `writePolicy`. Whatever policy the adapter
 * ends up with can only have come from `RepositoryModule.forFeature()`.
 */
@Module({})
class PolicyUnawareDriverModule {
  static forFeature(entities: { key: string }[]): DynamicModule {
    return {
      module: PolicyUnawareDriverModule,
      providers: entities.map(({ key }) => ({
        provide: getDynamicRepositoryToken(key),
        useFactory: () =>
          key === 'audited'
            ? new TestRepositoryAdapter(key)
            : new AppendableAdapter(key),
      })),
      exports: entities.map(({ key }) => getDynamicRepositoryToken(key)),
    };
  }
}

function compile(
  entities: Parameters<typeof RepositoryModule.forFeature>[0]['entities'],
  rootOptions: Parameters<typeof RepositoryModule.forRoot>[0] = {},
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      RepositoryModule.forRoot(rootOptions),
      RepositoryModule.forFeature({
        module: PolicyUnawareDriverModule,
        entities,
      }),
    ],
  }).compile();
}

describe('write policy binding', () => {
  it('applies a declared policy even though the driver ignores it', async () => {
    const moduleRef = await compile([
      { key: 'items', entity: TestEntityClass, writePolicy: APPEND_ONLY },
    ]);
    await moduleRef.init();

    const items = moduleRef.get<AppendableAdapter>(
      getDynamicRepositoryToken('items'),
    );

    expect(items.writePolicyDeclaration).toEqual(APPEND_ONLY);
    await expect(items.update(row, { name: 'changed' })).rejects.toThrow(
      AppendOnlyViolationException,
    );

    await moduleRef.close();
  });

  it('leaves an undeclared entity without a policy', async () => {
    const moduleRef = await compile([
      { key: 'items', entity: TestEntityClass },
    ]);
    await moduleRef.init();

    const items = moduleRef.get<AppendableAdapter>(
      getDynamicRepositoryToken('items'),
    );

    expect(items.writePolicyDeclaration).toBeUndefined();

    await moduleRef.close();
  });

  it('refuses to start when an append-only entity has a soft-delete column', async () => {
    const moduleRef = await compile([
      { key: 'audited', entity: TestEntityClass, writePolicy: APPEND_ONLY },
    ]);

    await expect(moduleRef.init()).rejects.toThrow(WritePolicyBootException);
  });

  it('refuses to start on an undeclared entity when declarations are required', async () => {
    const moduleRef = await compile(
      [{ key: 'items', entity: TestEntityClass }],
      {
        requireWritePolicyDeclaration: true,
      },
    );

    await expect(moduleRef.init()).rejects.toThrow(WritePolicyBootException);
  });

  it('binds a policy only once', () => {
    const adapter = new AppendableAdapter('items');
    adapter.setWritePolicy(APPEND_ONLY);

    expect(() => adapter.setWritePolicy({ access: 'mutable' })).toThrow(
      WritePolicyBootException,
    );
    expect(adapter.writePolicyDeclaration).toEqual(APPEND_ONLY);
  });

  /**
   * The usual cause is one key registered twice, both entries declaring a
   * policy. The binding runs before the duplicate-key check, so this message
   * is the one the developer sees.
   */
  it('points a double bind at a duplicate registration', () => {
    const adapter = new AppendableAdapter('items');
    adapter.setWritePolicy(APPEND_ONLY);

    expect(() => adapter.setWritePolicy(APPEND_ONLY)).toThrow(
      'Is "items" registered more than once in forFeature()?',
    );
  });
});
