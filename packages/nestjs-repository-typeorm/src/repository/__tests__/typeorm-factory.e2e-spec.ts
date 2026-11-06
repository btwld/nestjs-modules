import { type DataSource, Repository } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  RepositoryModule,
  type RepositoryInterface,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { ListenedEntityFixture } from '../../__fixtures__/repository/entity/listened.entity.fixture.js';
import { TypeOrmSqliteRepositoryModule } from '../../sqlite/typeorm-sqlite-repository.module.js';

/** The custom repository a `factory` returns. */
class CustomRepositoryFixture extends Repository<ListenedEntityFixture> {}

describe('TypeOrmRepository with a factory', () => {
  let moduleFixture: TestingModule;
  let listened: RepositoryInterface<ListenedEntityFixture>;
  let scope: TransactionScope;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          entities: [ListenedEntityFixture],
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmSqliteRepositoryModule,
              entities: [
                {
                  key: 'listened',
                  entity: ListenedEntityFixture,
                  factory: (dataSource: DataSource) =>
                    new CustomRepositoryFixture(
                      ListenedEntityFixture,
                      dataSource.manager,
                    ),
                },
              ],
            },
          ],
        }),
      ],
    }).compile();
    listened = moduleFixture.get(getDynamicRepositoryToken('listened'));
    scope = moduleFixture.get(TransactionScope);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await moduleFixture.close();
  });

  it("writes through the factory's repository, in a run as outside one", async () => {
    const save = vi.spyOn(CustomRepositoryFixture.prototype, 'save');

    await listened.create({ name: 'outside' });
    await scope.run({}, (txCtx) =>
      listened.create({ name: 'inside' }, { ctx: txCtx }),
    );

    expect(save).toHaveBeenCalledTimes(2);
  });
});
