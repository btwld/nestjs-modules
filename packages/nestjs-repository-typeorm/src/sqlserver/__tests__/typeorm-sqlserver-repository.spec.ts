import { DataSource, QueryFailedError, type Repository } from 'typeorm';

import { ormConfig } from '../../__fixtures__/repository/config/ormconfig.fixture.js';
import { TestEntityFixture } from '../../__fixtures__/repository/entity/test.entity.fixture.js';
import { TypeOrmSqlServerRepository } from '../typeorm-sqlserver-repository.js';

class ReportingRepository extends TypeOrmSqlServerRepository<TestEntityFixture> {
  report(error: unknown) {
    return this.describeDatabaseError(error);
  }

  escape(value: string) {
    return this.escapeLike(value);
  }
}

describe(TypeOrmSqlServerRepository.name, () => {
  let dataSource: DataSource;
  let repository: ReportingRepository;

  beforeAll(async () => {
    dataSource = await new DataSource(ormConfig).initialize();
    const sqliteRepo = dataSource.getRepository(TestEntityFixture);
    const repo: Repository<TestEntityFixture> = Object.create(sqliteRepo, {
      metadata: { value: sqliteRepo.metadata },
      manager: {
        value: {
          dataSource: {
            options: { type: 'mssql' },
            driver: { database: 'shop' },
          },
        },
      },
    });
    repository = new ReportingRepository(repo, { entityKey: 'test' });
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('escapes the character-set opener `[` along with `%`, `_` and `!`', () => {
    expect(repository.escape('[a]%_!')).toBe('![a]!%!_!!');
  });

  const failed = (driverError: Error) =>
    new QueryFailedError('INSERT', [], driverError);

  it("reports SQL Server's error number in place of the client's code", () => {
    const driverError = Object.assign(new Error('Violation of PRIMARY KEY'), {
      code: 'EREQUEST',
      number: 2627,
    });

    expect(repository.report(failed(driverError))).toEqual({
      database: 'sqlserver',
      code: 2627,
      message: 'Violation of PRIMARY KEY',
    });
  });

  it("keeps the client's code for an error without a number", () => {
    const driverError = Object.assign(new Error('Connection lost'), {
      code: 'ESOCKET',
    });

    expect(repository.report(failed(driverError))).toEqual({
      database: 'sqlserver',
      code: 'ESOCKET',
      message: 'Connection lost',
    });
  });
});
