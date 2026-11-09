import { DataSource, type Repository } from 'typeorm';

import { ormConfig } from '../../__fixtures__/repository/config/ormconfig.fixture.js';
import { TestEntityFixture } from '../../__fixtures__/repository/entity/test.entity.fixture.js';
import { TypeOrmUnsupportedDatabaseException } from '../../exceptions/typeorm-unsupported-database.exception.js';
import { TypeOrmMysqlRepository } from '../../mysql/typeorm-mysql-repository.js';
import { TypeOrmMariadbRepository } from '../typeorm-mariadb-repository.js';

describe(TypeOrmMariadbRepository.name, () => {
  let dataSource: DataSource;
  let sqliteRepo: Repository<TestEntityFixture>;

  beforeAll(async () => {
    dataSource = await new DataSource(ormConfig).initialize();
    sqliteRepo = dataSource.getRepository(TestEntityFixture);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  /** The test entity's repository, on a data source of `type`. */
  function repoOn(type: string): Repository<TestEntityFixture> {
    const repo: Repository<TestEntityFixture> = Object.create(sqliteRepo, {
      metadata: { value: sqliteRepo.metadata },
      manager: {
        value: {
          dataSource: { options: { type }, driver: { database: 'shop' } },
        },
      },
    });
    return repo;
  }

  it('accepts a MariaDB data source and refuses a MySQL one', () => {
    const options = { entityKey: 'test' };

    expect(
      () => new TypeOrmMariadbRepository(repoOn('mariadb'), options),
    ).not.toThrow();
    expect(
      () => new TypeOrmMariadbRepository(repoOn('mysql'), options),
    ).toThrow(TypeOrmUnsupportedDatabaseException);
    expect(
      () => new TypeOrmMysqlRepository(repoOn('mariadb'), options),
    ).toThrow(TypeOrmUnsupportedDatabaseException);
  });
});
