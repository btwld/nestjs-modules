import { DataSource, Repository } from 'typeorm';

import { Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  RepositoryInterface,
  RepositoryModule,
} from '@concepta/nestjs-repository';

import { ormConfig } from '../../__fixtures__/repository/config/ormconfig.fixture.js';
import { TestEntityFixture } from '../../__fixtures__/repository/entity/test.entity.fixture.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';
import { TypeOrmRepository } from '../typeorm-repository.js';

const FACTORY_TOKEN = 'test-factory';
const STANDARD_TOKEN = 'test-standard';

interface CustomRepositoryMethods {
  customMethod(): string;
}

type CustomRepository = Repository<TestEntityFixture> & CustomRepositoryMethods;

const createCustomRepository = (dataSource: DataSource): CustomRepository => {
  return dataSource
    .getRepository(TestEntityFixture)
    .extend<CustomRepositoryMethods>({
      customMethod(): string {
        return 'custom';
      },
    });
};

@Module({
  imports: [
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        {
          key: FACTORY_TOKEN,
          entity: TestEntityFixture,
          factory: createCustomRepository,
        },
        {
          key: STANDARD_TOKEN,
          entity: TestEntityFixture,
        },
      ],
    }),
  ],
})
class RegistrationTestModuleFixture {}

describe(TypeOrmRepository, () => {
  describe('provider registration', () => {
    let moduleFixture: TestingModule;

    beforeEach(async () => {
      moduleFixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormConfig),
          RepositoryModule.forRoot({}),
          RegistrationTestModuleFixture,
        ],
      }).compile();
    });

    afterEach(async () => {
      await moduleFixture.close();
    });

    it('should register standard repository with correct public token', () => {
      const expectedToken = getDynamicRepositoryToken(STANDARD_TOKEN);
      const repository =
        moduleFixture.get<RepositoryInterface<TestEntityFixture>>(
          expectedToken,
        );

      expect(expectedToken).toBe('DYNAMIC_REPOSITORY_TOKEN_test-standard');
      expect(repository.metadata.name).toBe('TestEntityFixture');
    });

    it('should register factory repository with correct public token', () => {
      const expectedToken = getDynamicRepositoryToken(FACTORY_TOKEN);
      const repository =
        moduleFixture.get<RepositoryInterface<TestEntityFixture>>(
          expectedToken,
        );

      expect(expectedToken).toBe('DYNAMIC_REPOSITORY_TOKEN_test-factory');
      expect(repository.metadata.name).toBe('TestEntityFixture');
    });

    it('should have correct entity name on standard repository', () => {
      const repository = moduleFixture.get<
        RepositoryInterface<TestEntityFixture>
      >(getDynamicRepositoryToken(STANDARD_TOKEN));

      expect(repository.metadata.name).toBe('TestEntityFixture');
    });

    it('should have correct entity name on factory repository', () => {
      const repository = moduleFixture.get<
        RepositoryInterface<TestEntityFixture>
      >(getDynamicRepositoryToken(FACTORY_TOKEN));

      expect(repository.metadata.name).toBe('TestEntityFixture');
    });

    it('should throw when retrieving unregistered token', () => {
      expect(() => {
        moduleFixture.get(getDynamicRepositoryToken('not-registered'));
      }).toThrow();
    });

    it('should provide access to TypeORM repository via public token', () => {
      const repository = moduleFixture.get<
        TypeOrmRepository<TestEntityFixture>
      >(getDynamicRepositoryToken(STANDARD_TOKEN));

      expect(repository).toBeInstanceOf(TypeOrmRepository);
      expect(repository.metadata.type).toBe(TestEntityFixture);
    });
  });

  describe('factory pattern', () => {
    let moduleFixture: TestingModule;
    let customRepository: TypeOrmRepository<TestEntityFixture>;

    beforeEach(async () => {
      moduleFixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormConfig),
          RepositoryModule.forRoot({}),
          RegistrationTestModuleFixture,
        ],
      }).compile();

      // Get the TypeOrmRepository via public token
      customRepository = moduleFixture.get<
        TypeOrmRepository<TestEntityFixture>
      >(getDynamicRepositoryToken(FACTORY_TOKEN));
    });

    afterEach(async () => {
      await moduleFixture.close();
    });

    it('should create repository with custom factory', () => {
      expect(customRepository).toBeInstanceOf(TypeOrmRepository);
    });

    it('should have custom method available on underlying repo', () => {
      const repo = customRepository['repo'] as CustomRepository;
      expect(repo.customMethod).toBeInstanceOf(Function);
      expect(repo.customMethod()).toBe('custom');
    });
  });
});
