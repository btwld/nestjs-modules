import { DataSource, QueryFailedError, type Repository } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
  RepositoryModule,
} from '@concepta/nestjs-repository';

import { ormConfig } from '../../__fixtures__/repository/config/ormconfig.fixture.js';
import { TestEntityFixture } from '../../__fixtures__/repository/entity/test.entity.fixture.js';
import { TypeOrmUnsupportedDatabaseException } from '../../exceptions/typeorm-unsupported-database.exception.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';
import { type TypeOrmProviderOptionsInterface } from '../typeorm-provider-options.interface.js';
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

/**
 * One registration per test module: the standard and factory repositories
 * read the same rows, which `RepositoryModule.forRoot()` refuses to register
 * twice.
 */
const compileRegistration = (
  entity: TypeOrmProviderOptionsInterface,
): Promise<TestingModule> =>
  Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot(ormConfig),
      RepositoryModule.forRoot({
        drivers: [{ driver: TypeOrmRepositoryModule, entities: [entity] }],
      }),
    ],
  }).compile();

const FACTORY_REGISTRATION: TypeOrmProviderOptionsInterface = {
  key: FACTORY_TOKEN,
  entity: TestEntityFixture,
  factory: createCustomRepository,
};

describe(TypeOrmRepository, () => {
  describe('provider registration', () => {
    let moduleFixture: TestingModule;

    beforeEach(async () => {
      moduleFixture = await compileRegistration({
        key: STANDARD_TOKEN,
        entity: TestEntityFixture,
      });
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

      expect(repository.metadata.name).toBe('TestEntityFixture');
    });

    it('should have correct entity name on standard repository', () => {
      const repository = moduleFixture.get<
        RepositoryInterface<TestEntityFixture>
      >(getDynamicRepositoryToken(STANDARD_TOKEN));

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
      moduleFixture = await compileRegistration(FACTORY_REGISTRATION);

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
      expect(customRepository.metadata.name).toBe('TestEntityFixture');
    });

    it('should have custom method available on underlying repo', () => {
      const repo = customRepository['repo'] as CustomRepository;
      expect(repo.customMethod).toBeInstanceOf(Function);
      expect(repo.customMethod()).toBe('custom');
    });
  });

  describe('built on a TypeORM repository', () => {
    let dataSource: DataSource;
    let sqliteRepo: Repository<TestEntityFixture>;

    beforeAll(async () => {
      dataSource = await new DataSource(ormConfig).initialize();
      sqliteRepo = dataSource.getRepository(TestEntityFixture);
    });

    afterAll(async () => {
      await dataSource.destroy();
    });

    /** The SQLite repository, with `values` in place of its own properties. */
    function sqliteRepoWith(
      values: PlainLiteralObject,
    ): Repository<TestEntityFixture> {
      const properties: PropertyDescriptorMap = {
        metadata: { value: sqliteRepo.metadata },
      };
      for (const [key, value] of Object.entries(values)) {
        properties[key] = { value };
      }
      const repo: Repository<TestEntityFixture> = Object.create(
        sqliteRepo,
        properties,
      );
      return repo;
    }

    describe('database errors', () => {
      class ReportingRepository extends TypeOrmRepository<TestEntityFixture> {
        report(error: unknown) {
          return this.describeDatabaseError(error);
        }
      }

      const failed = (driverError: Error) =>
        new QueryFailedError('INSERT', [], driverError);

      it.each([
        [
          'the client code',
          Object.assign(new Error('duplicate'), { code: '23505', errno: 7 }),
          { database: 'better-sqlite3', code: '23505', message: 'duplicate' },
        ],
        [
          'the errno without a code',
          Object.assign(new Error('missing row'), { errno: 1452 }),
          { database: 'better-sqlite3', code: 1452, message: 'missing row' },
        ],
        [
          'no code when the client gives none',
          new Error('lost connection'),
          {
            database: 'better-sqlite3',
            code: undefined,
            message: 'lost connection',
          },
        ],
      ])('reports %s', (_, driverError, expected) => {
        const repository = new ReportingRepository(sqliteRepo, {
          entityKey: 'test',
        });
        expect(repository.report(failed(driverError))).toEqual(expected);
      });

      it('reports nothing for an error the database did not raise', () => {
        const repository = new ReportingRepository(sqliteRepo, {
          entityKey: 'test',
        });
        expect(repository.report(new Error('bug'))).toBeUndefined();
      });
    });

    it('refuses an entity target that is not a class', () => {
      const repo = sqliteRepoWith({ target: 'TestEntityFixture' });

      expect(() => new TypeOrmRepository(repo, { entityKey: 'test' })).toThrow(
        expect.objectContaining({
          fault: 'usage',
          message:
            'Invalid entity for "TestEntityFixture": expected an entity class',
        }),
      );
    });

    it('names its rows by the database the driver resolved, not the options', () => {
      // A connection given as `url` leaves `options.database` unset; its
      // driver resolves the database from the URL.
      const repo = sqliteRepoWith({
        manager: {
          dataSource: {
            options: { type: 'postgres', url: 'postgres://db.example/shop' },
            driver: { database: 'shop' },
          },
        },
      });

      expect(
        new TypeOrmRepository(repo, { entityKey: 'test' }).metadata.urn,
      ).toBe(`urn:typeorm:shop:${sqliteRepo.metadata.tableName}`);
    });

    it('refuses a MongoDB data source', () => {
      const repo = sqliteRepoWith({
        manager: { dataSource: { options: { type: 'mongodb' } } },
      });

      const build = () => new TypeOrmRepository(repo, { entityKey: 'test' });

      expect(build).toThrow(TypeOrmUnsupportedDatabaseException);
      expect(build).toThrow(
        expect.objectContaining({
          fault: 'usage',
          message:
            'TestEntityFixture uses a "mongodb" data source, which ' +
            'TypeOrmRepository does not support. It supports SQL databases only',
        }),
      );
    });
  });
});
