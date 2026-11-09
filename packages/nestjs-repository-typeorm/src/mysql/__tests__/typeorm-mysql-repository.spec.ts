import { DataSource, type Repository } from 'typeorm';

import { type RepositoryFindOptions } from '@concepta/nestjs-repository';

import { ormConfig } from '../../__fixtures__/repository/config/ormconfig.fixture.js';
import { TestEntityFixture } from '../../__fixtures__/repository/entity/test.entity.fixture.js';
import { TypeOrmMysqlRepository } from '../typeorm-mysql-repository.js';

class InspectedMysqlRepository extends TypeOrmMysqlRepository<TestEntityFixture> {
  findManyOptions(options: RepositoryFindOptions<TestEntityFixture>) {
    return this.buildNativeFindManyOptions(options);
  }
}

describe(TypeOrmMysqlRepository.name, () => {
  let dataSource: DataSource;
  let sqliteRepo: Repository<TestEntityFixture>;

  beforeAll(async () => {
    dataSource = await new DataSource(ormConfig).initialize();
    sqliteRepo = dataSource.getRepository(TestEntityFixture);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  /** The test entity's repository, on a MySQL data source with `options`. */
  function mysqlRepo(options: object = {}): Repository<TestEntityFixture> {
    const repo: Repository<TestEntityFixture> = Object.create(sqliteRepo, {
      metadata: { value: sqliteRepo.metadata },
      manager: {
        value: {
          dataSource: {
            options: { type: 'mysql', ...options },
            driver: { database: 'shop' },
          },
        },
      },
    });
    return repo;
  }

  it('sets the largest limit on a read that skips rows without a take', () => {
    const repository = new InspectedMysqlRepository(mysqlRepo(), {
      entityKey: 'test',
    });

    expect(repository.findManyOptions({ skip: 2 }).take).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    expect(repository.findManyOptions({ skip: 2, take: 3 }).take).toBe(3);
    expect(repository.findManyOptions({}).take).toBeUndefined();
  });
});
