import { type DynamicModule, Module } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { type RepositoryModuleOptionsInterface } from '../../interfaces/repository-module-options.interface.js';
import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
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
 * ends up with can only have come from `RepositoryModule.forRoot()`.
 */
@Module({})
class PolicyUnawareDriverModule {
  static register(entities: RepositoryProviderOptions[]): DynamicModule {
    return {
      module: PolicyUnawareDriverModule,
      providers: entities.map(({ key }) => ({
        provide: getDynamicRepositoryToken(key),
        useFactory: () =>
          key === 'audited'
            ? new TestRepositoryAdapter(key)
            : new AppendableAdapter(key),
      })),
    };
  }
}

async function compile(
  entities: RepositoryProviderOptions[],
  moduleOptions: RepositoryModuleOptionsInterface = {},
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      RepositoryModule.forRoot({
        ...moduleOptions,
        drivers: [{ driver: PolicyUnawareDriverModule, entities }],
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
    await expect(
      compile([
        { key: 'audited', entity: TestEntityClass, writePolicy: APPEND_ONLY },
      ]),
    ).rejects.toThrow(WritePolicyBootException);
  });

  it('refuses to start on an undeclared entity when declarations are required', async () => {
    await expect(
      compile([{ key: 'items', entity: TestEntityClass }], {
        requireWritePolicyDeclaration: true,
      }),
    ).rejects.toThrow(WritePolicyBootException);
  });

  it('reads the requirement from forRootAsync settings', async () => {
    const SETTINGS = 'SETTINGS';

    @Module({
      providers: [{ provide: SETTINGS, useValue: { strict: true } }],
      exports: [SETTINGS],
    })
    class SettingsModule {}

    await expect(
      Test.createTestingModule({
        imports: [
          RepositoryModule.forRootAsync({
            imports: [SettingsModule],
            inject: [SETTINGS],
            useFactory: async (settings: { strict: boolean }) => ({
              requireWritePolicyDeclaration: settings.strict,
            }),
            drivers: [
              {
                driver: PolicyUnawareDriverModule,
                entities: [{ key: 'items', entity: TestEntityClass }],
              },
            ],
          }),
        ],
      }).compile(),
    ).rejects.toThrow(WritePolicyBootException);
  });
});
