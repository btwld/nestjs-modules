import {
  Module,
  DynamicModule,
  Injectable,
  type PlainLiteralObject,
  Scope,
} from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import {
  NoteEntityFixture,
  PET_METADATA,
  PetEntityFixture,
} from '../../__fixtures__/memory/pet-note.fixture.js';
import { InjectDynamicRepository } from '../../decorators/inject-dynamic-repository.decorator.js';
import { RepositoryBootException } from '../../exceptions/repository-boot.exception.js';
import { RepositoryDuplicateKeyException } from '../../exceptions/repository-duplicate-key.exception.js';
import { RepositoryDuplicateUrnException } from '../../exceptions/repository-duplicate-urn.exception.js';
import { type DynamicRepositoryModule } from '../../interfaces/repository-module.interface.js';
import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
import { RepositoryModule } from '../../repository.module.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';
import {
  REPOSITORY_REGISTRY,
  RepositoryRegistryService,
} from '../repository-registry.service.js';

// Mock entity classes
class UserEntity {}
class OrderEntity {}
class DuplicateUserEntity {}

// Mock driver: an in-memory repository per entry, each reading its own rows
@Module({})
class MockRepositoryModule {
  static register(entities: RepositoryProviderOptions[]): DynamicModule {
    return {
      module: MockRepositoryModule,
      providers: entities.map(({ key, entity }) => ({
        provide: getDynamicRepositoryToken(key),
        useFactory: () =>
          new MemoryRepositoryFixture<PlainLiteralObject>(key, {
            name: entity.name,
            type: entity,
            urn: `urn:mock:${key}`,
            columns: [
              {
                name: 'id',
                isPrimary: true,
                isRemoveDate: false,
                isVersion: false,
              },
            ],
          }),
      })),
    };
  }
}

const mockRoot = (
  entities: RepositoryProviderOptions[],
): ReturnType<typeof RepositoryModule.forRoot> =>
  RepositoryModule.forRoot({
    drivers: [{ driver: MockRepositoryModule, entities }],
  });

const memoryRoot = (
  entities: RepositoryProviderOptions[],
): ReturnType<typeof RepositoryModule.forRoot> =>
  RepositoryModule.forRoot({
    drivers: [{ driver: MemoryRepositoryModuleFixture, entities }],
  });

describe('RepositoryRegistryService', () => {
  it('should allow unique keys', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        mockRoot([
          { key: 'users', entity: UserEntity },
          { key: 'orders', entity: OrderEntity },
        ]),
      ],
    }).compile();

    await moduleRef.close();
  });

  it('should throw on duplicate keys', () => {
    expect(() =>
      mockRoot([
        { key: 'users', entity: UserEntity },
        { key: 'users', entity: DuplicateUserEntity },
      ]),
    ).toThrow(
      new RepositoryDuplicateKeyException([
        {
          key: 'users',
          existing: 'UserEntity',
          attempted: 'DuplicateUserEntity',
        },
      ]),
    );
  });

  it('should throw when two keys register the same rows', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          memoryRoot([
            { key: 'pets', entity: PetEntityFixture },
            { key: 'pets-admin', entity: PetEntityFixture },
          ]),
        ],
      }).compile(),
    ).rejects.toThrow(
      new RepositoryDuplicateUrnException([
        { urn: 'urn:memory:Pet', existing: 'pets', attempted: 'pets-admin' },
      ]),
    );
  });

  it('should throw when another entity class registers the same rows', async () => {
    class PetViewEntity extends PetEntityFixture {}

    @Module({})
    class SharedRowsModule {
      static register(entities: RepositoryProviderOptions[]): DynamicModule {
        return {
          module: SharedRowsModule,
          providers: entities.map(({ key }) => ({
            provide: getDynamicRepositoryToken(key),
            useFactory: () =>
              new MemoryRepositoryFixture(key, {
                ...PET_METADATA,
                name: 'PetView',
                type: PetViewEntity,
              }),
          })),
        };
      }
    }

    await expect(
      Test.createTestingModule({
        imports: [
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: MemoryRepositoryModuleFixture,
                entities: [{ key: 'pets', entity: PetEntityFixture }],
              },
              {
                driver: SharedRowsModule,
                entities: [{ key: 'pet-views', entity: PetViewEntity }],
              },
            ],
          }),
        ],
      }).compile(),
    ).rejects.toThrow(
      new RepositoryDuplicateUrnException([
        { urn: 'urn:memory:Pet', existing: 'pets', attempted: 'pet-views' },
      ]),
    );
  });

  it('should allow different rows registered under different keys', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        memoryRoot([
          { key: 'pets', entity: PetEntityFixture },
          { key: 'notes', entity: NoteEntityFixture },
        ]),
      ],
    }).compile();

    await moduleRef.close();
  });

  it('should look up registry item by URN', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        mockRoot([
          { key: 'users', entity: UserEntity },
          { key: 'orders', entity: OrderEntity },
        ]),
      ],
    }).compile();

    const registry =
      moduleRef.get<RepositoryRegistryService>(REPOSITORY_REGISTRY);

    const userItem = registry.getByUrn('urn:mock:users');
    expect(userItem).toEqual({
      key: 'users',
      entityName: 'UserEntity',
      urn: 'urn:mock:users',
      adapter: moduleRef.get(getDynamicRepositoryToken('users')),
    });

    const orderItem = registry.getByUrn('urn:mock:orders');
    expect(orderItem).toEqual({
      key: 'orders',
      entityName: 'OrderEntity',
      urn: 'urn:mock:orders',
      adapter: moduleRef.get(getDynamicRepositoryToken('orders')),
    });

    expect(registry.getByUrn('urn:mock:invoices')).toBeUndefined();

    await moduleRef.close();
  });

  it('should look up every registry item with an entity name', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        mockRoot([
          { key: 'users', entity: UserEntity },
          { key: 'archivedUsers', entity: UserEntity },
          { key: 'orders', entity: OrderEntity },
        ]),
      ],
    }).compile();

    const registry =
      moduleRef.get<RepositoryRegistryService>(REPOSITORY_REGISTRY);

    expect(
      registry.getByEntityName('UserEntity').map(({ key }) => key),
    ).toEqual(['users', 'archivedUsers']);
    expect(registry.getByEntityName('InvoiceEntity')).toEqual([]);

    await moduleRef.close();
  });

  it('should throw when a driver registers something other than an adapter', async () => {
    @Module({})
    class RawDriver {
      static register(entities: RepositoryProviderOptions[]): DynamicModule {
        return {
          module: RawDriver,
          providers: entities.map(({ key }) => ({
            provide: getDynamicRepositoryToken(key),
            useValue: { find: async () => [] },
          })),
        };
      }
    }

    await expect(
      Test.createTestingModule({
        imports: [
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: RawDriver,
                entities: [{ key: 'users', entity: UserEntity }],
              },
            ],
          }),
        ],
      }).compile(),
    ).rejects.toThrow(
      new RepositoryBootException([
        'Driver "RawDriver" registered "users" with a repository that does ' +
          'not extend RepositoryAdapter.',
      ]),
    );
  });

  it('should throw when one driver is listed twice', () => {
    expect(() =>
      RepositoryModule.forRoot({
        drivers: [
          {
            driver: MemoryRepositoryModuleFixture,
            entities: [{ key: 'pets', entity: PetEntityFixture }],
          },
          {
            driver: MemoryRepositoryModuleFixture,
            entities: [{ key: 'notes', entity: NoteEntityFixture }],
          },
        ],
      }),
    ).toThrow(
      'Driver "MemoryRepositoryModuleFixture" is listed more than once',
    );
  });

  it('should throw at init when a transaction factory depends on something request-scoped', async () => {
    @Injectable({ scope: Scope.REQUEST })
    class PerRequestConnection {}

    const driver = {
      name: 'PerRequestTxDriver',
      register: (
        entities: RepositoryProviderOptions[],
      ): DynamicRepositoryModule => {
        const { providers = [] } = MockRepositoryModule.register(entities);
        return {
          module: MockRepositoryModule,
          providers: [...providers, PerRequestConnection],
          transactionFactories: [
            {
              key: 'per-request:default',
              inject: [PerRequestConnection],
              useFactory: () => ({
                create: () => {
                  throw new Error('never started');
                },
              }),
            },
          ],
        };
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        RepositoryModule.forRoot({
          drivers: [
            { driver, entities: [{ key: 'users', entity: UserEntity }] },
          ],
        }),
      ],
    }).compile();

    await expect(moduleRef.init()).rejects.toThrow(
      'The transaction factory "per-request:default" was never registered',
    );
  });

  it('should throw when two drivers register one transaction key', () => {
    const sharedKeyDriver = (name: string) => ({
      name,
      register: (): DynamicRepositoryModule => ({
        module: MockRepositoryModule,
        transactionFactories: [
          {
            key: 'shared:default',
            inject: [],
            useFactory: () => ({
              create: () => {
                throw new Error('never started');
              },
            }),
          },
        ],
      }),
    });

    expect(() =>
      RepositoryModule.forRoot({
        drivers: [
          {
            driver: sharedKeyDriver('FirstDriver'),
            entities: [{ key: 'users', entity: UserEntity }],
          },
          {
            driver: sharedKeyDriver('SecondDriver'),
            entities: [{ key: 'orders', entity: OrderEntity }],
          },
        ],
      }),
    ).toThrow(
      'Transaction key "shared:default" is registered by more than one driver',
    );
  });

  it('should throw when forRoot is imported more than once', async () => {
    @Module({
      imports: [memoryRoot([{ key: 'notes', entity: NoteEntityFixture }])],
    })
    class NotesModule {}

    await expect(
      Test.createTestingModule({
        imports: [
          memoryRoot([{ key: 'pets', entity: PetEntityFixture }]),
          NotesModule,
        ],
      }).compile(),
    ).rejects.toThrow('RepositoryModule.forRoot() is imported more than once');
  });
});

describe('RepositoryModule.forRoot entity options', () => {
  interface CollectionOptions extends RepositoryProviderOptions {
    collection?: string;
  }

  interface CollectionDriverOptions {
    shard?: string;
  }

  @Module({})
  class CollectionDriver {
    static received?: CollectionDriverOptions;

    static register(
      _entities: CollectionOptions[],
      options?: CollectionDriverOptions,
    ): DynamicModule {
      CollectionDriver.received = options;
      return { module: CollectionDriver };
    }
  }

  it('hands the driver its own options', () => {
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: CollectionDriver,
          entities: [{ key: 'pets', entity: PetEntityFixture }],
          options: { shard: 'a' },
        },
      ],
    });

    expect(CollectionDriver.received).toEqual({ shard: 'a' });
  });

  it('refuses a misspelled driver option at compile time', () => {
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: CollectionDriver,
          entities: [{ key: 'pets', entity: PetEntityFixture }],
          // @ts-expect-error `shrd` is not a CollectionDriver option
          options: { shrd: 'a' },
        },
      ],
    });
  });

  it('refuses options for a driver that takes none at compile time', () => {
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: MemoryRepositoryModuleFixture,
          entities: [{ key: 'pets', entity: PetEntityFixture }],
          // @ts-expect-error MemoryRepositoryModuleFixture takes no options
          options: { shard: 'a' },
        },
      ],
    });
  });

  it("accepts each driver's own options", () => {
    expect(() =>
      RepositoryModule.forRoot({
        drivers: [
          {
            driver: CollectionDriver,
            entities: [
              { key: 'pets', entity: PetEntityFixture, collection: 'p' },
            ],
          },
          {
            driver: MemoryRepositoryModuleFixture,
            entities: [{ key: 'notes', entity: NoteEntityFixture }],
          },
        ],
      }),
    ).not.toThrow();
  });

  it('refuses a misspelled option at compile time', () => {
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: MemoryRepositoryModuleFixture,
          entities: [
            {
              key: 'pets',
              entity: PetEntityFixture,
              // @ts-expect-error `writePolcy` is not an option
              writePolcy: { access: 'mutable' },
            },
          ],
        },
      ],
    });
  });

  it("refuses another driver's option at compile time", () => {
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: CollectionDriver,
          entities: [{ key: 'pets', entity: PetEntityFixture }],
        },
        {
          driver: MemoryRepositoryModuleFixture,
          entities: [
            // @ts-expect-error `collection` belongs to CollectionDriver
            { key: 'notes', entity: NoteEntityFixture, collection: 'n' },
          ],
        },
      ],
    });
  });
});

describe('RepositoryModule.forFeature', () => {
  @Injectable()
  class PetsService {
    constructor(
      @InjectDynamicRepository('pets')
      readonly pets: MemoryRepositoryFixture<PlainLiteralObject>,
    ) {}
  }

  it('hands out the repository registered in forRoot', async () => {
    @Module({
      imports: [RepositoryModule.forFeature(['pets'])],
      providers: [PetsService],
    })
    class PetsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        memoryRoot([{ key: 'pets', entity: PetEntityFixture }]),
        PetsModule,
      ],
    }).compile();

    expect(moduleRef.get(PetsService).pets).toBeInstanceOf(
      MemoryRepositoryFixture,
    );
    expect(moduleRef.get(PetsService).pets.allowsEagerRelations).toBe(false);

    await moduleRef.close();
  });

  it('keeps a repository out of a module that did not ask for it', async () => {
    @Module({ providers: [PetsService] })
    class PetsModule {}

    await expect(
      Test.createTestingModule({
        imports: [
          memoryRoot([{ key: 'pets', entity: PetEntityFixture }]),
          PetsModule,
        ],
      }).compile(),
    ).rejects.toThrow(/can't resolve dependencies of the PetsService/);
  });

  it('refuses a key forRoot did not register', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          memoryRoot([{ key: 'pets', entity: PetEntityFixture }]),
          RepositoryModule.forFeature(['invoices']),
        ],
      }).compile(),
    ).rejects.toThrow(
      new RepositoryBootException([
        'RepositoryModule.forFeature() asks for "invoices", which is not ' +
          'registered in RepositoryModule.forRoot().',
      ]),
    );
  });

  it("binds every driver's repositories", async () => {
    @Injectable()
    class BothService {
      constructor(
        @InjectDynamicRepository('pets')
        readonly pets: MemoryRepositoryFixture<PlainLiteralObject>,
        @InjectDynamicRepository('users')
        readonly users: MemoryRepositoryFixture<PlainLiteralObject>,
      ) {}
    }

    const moduleRef = await Test.createTestingModule({
      imports: [
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: MemoryRepositoryModuleFixture,
              entities: [{ key: 'pets', entity: PetEntityFixture }],
            },
            {
              driver: MockRepositoryModule,
              entities: [{ key: 'users', entity: UserEntity }],
            },
          ],
        }),
        RepositoryModule.forFeature(['pets', 'users']),
      ],
      providers: [BothService],
    }).compile();
    const { pets, users } = moduleRef.get(BothService);

    await expect(pets.find({ ctx: {} })).resolves.toEqual([]);
    await expect(users.find({ ctx: {} })).resolves.toEqual([]);

    await moduleRef.close();
  });

  describe('in a lazily loaded module', () => {
    const loadLazy = async (
      keys: string[],
      use: (service: PetsService) => Promise<void> = async () => {},
    ): Promise<void> => {
      @Module({
        imports: [RepositoryModule.forFeature(keys)],
        providers: [PetsService],
      })
      class LazyPetsModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [memoryRoot([{ key: 'pets', entity: PetEntityFixture }])],
      }).compile();
      await moduleRef.init();

      try {
        const lazy = await moduleRef
          .get(LazyModuleLoader)
          .load(() => LazyPetsModule);
        await use(lazy.get(PetsService));
      } finally {
        await moduleRef.close();
      }
    };

    it('hands out the repository forRoot bound', async () => {
      await loadLazy(['pets'], async ({ pets }) => {
        await expect(pets.find({ ctx: {} })).resolves.toEqual([]);
      });
    });

    it('refuses a key forRoot did not register', async () => {
      await expect(loadLazy(['pets', 'invoices'])).rejects.toThrow(
        'asks for "invoices", which is not registered',
      );
    });
  });

  it('refuses when forRoot is not imported', async () => {
    await expect(
      Test.createTestingModule({
        imports: [RepositoryModule.forFeature(['pets'])],
      }).compile(),
    ).rejects.toThrow('import RepositoryModule.forRoot()');
  });
});
