import { Module, DynamicModule } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { RepositoryDuplicateKeyException } from '../../exceptions/repository-duplicate-key.exception.js';
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

// Mock repository module that provides adapter tokens
@Module({})
class MockRepositoryModule {
  static forFeature(
    entities: { key: string; entity: { name: string } }[],
  ): DynamicModule {
    return {
      module: MockRepositoryModule,
      providers: entities.map((e) => ({
        provide: getDynamicRepositoryToken(e.key),
        useValue: { entity: e.entity, entityName: () => e.entity.name },
      })),
      exports: entities.map((e) => getDynamicRepositoryToken(e.key)),
    };
  }
}

describe('RepositoryRegistryService', () => {
  it('should allow unique keys', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        RepositoryModule.forRoot({}),
        RepositoryModule.forFeature({
          module: MockRepositoryModule,
          entities: [
            { key: 'users', entity: UserEntity },
            { key: 'orders', entity: OrderEntity },
          ],
        }),
      ],
    }).compile();

    const app = moduleRef.createNestApplication();

    // Should not throw - unique keys are allowed
    await expect(app.init()).resolves.not.toThrow();

    await app.close();
  });

  it('should throw on duplicate keys at bootstrap', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        RepositoryModule.forRoot({}),
        RepositoryModule.forFeature({
          module: MockRepositoryModule,
          entities: [{ key: 'users', entity: UserEntity }],
        }),
        RepositoryModule.forFeature({
          module: MockRepositoryModule,
          entities: [{ key: 'users', entity: DuplicateUserEntity }],
        }),
      ],
    }).compile();

    const app = moduleRef.createNestApplication();

    await expect(app.init()).rejects.toThrow(RepositoryDuplicateKeyException);

    await app.close();
  });

  it('should look up registry item by entity name after bootstrap', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        RepositoryModule.forRoot({}),
        RepositoryModule.forFeature({
          module: MockRepositoryModule,
          entities: [
            { key: 'users', entity: UserEntity },
            { key: 'orders', entity: OrderEntity },
          ],
        }),
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const registry =
      moduleRef.get<RepositoryRegistryService>(REPOSITORY_REGISTRY);

    const userItem = registry.getByEntityName('UserEntity');
    expect(userItem).toEqual({
      key: 'users',
      entityName: 'UserEntity',
      moduleName: 'MockRepositoryModule',
    });

    const orderItem = registry.getByEntityName('OrderEntity');
    expect(orderItem).toEqual({
      key: 'orders',
      entityName: 'OrderEntity',
      moduleName: 'MockRepositoryModule',
    });

    expect(registry.getByEntityName('NonExistent')).toBeUndefined();

    await app.close();
  });

  it('should isolate registrations between test runs', async () => {
    // This test verifies that static state doesn't leak
    // by registering the same key that was used in the first test
    const moduleRef = await Test.createTestingModule({
      imports: [
        RepositoryModule.forRoot({}),
        RepositoryModule.forFeature({
          module: MockRepositoryModule,
          entities: [{ key: 'users', entity: UserEntity }],
        }),
      ],
    }).compile();

    const app = moduleRef.createNestApplication();

    // Should not throw - each test gets fresh registry
    await expect(app.init()).resolves.not.toThrow();

    await app.close();
  });
});
