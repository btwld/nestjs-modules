import { DataSource, type Repository } from 'typeorm';

import { type RepositoryFindOptions } from '@concepta/nestjs-repository';

import { ormConfig } from '../../__fixtures__/repository/config/ormconfig.fixture.js';
import { TestEntityFixture } from '../../__fixtures__/repository/entity/test.entity.fixture.js';
import { TypeOrmMysqlFoundRowsException } from '../typeorm-mysql-found-rows.exception.js';
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

  it('refuses a data source whose client flags turn off FOUND_ROWS', () => {
    const build = (options: object) => () =>
      new TypeOrmMysqlRepository(mysqlRepo(options), { entityKey: 'test' });

    expect(build({ flags: ['-FOUND_ROWS'] })).toThrow(
      TypeOrmMysqlFoundRowsException,
    );
    expect(build({ flags: 'LONG_PASSWORD, -found_rows' })).toThrow(
      TypeOrmMysqlFoundRowsException,
    );
    expect(build({ extra: { flags: ['-FOUND_ROWS'] } })).toThrow(
      TypeOrmMysqlFoundRowsException,
    );
    // `extra.flags` replaces `flags`, and a list is matched as given.
    expect(
      build({ flags: ['-FOUND_ROWS'], extra: { flags: ['-LONG_PASSWORD'] } }),
    ).not.toThrow();
    expect(build({ flags: ['-found_rows'] })).not.toThrow();
    expect(build({})).not.toThrow();
  });

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
