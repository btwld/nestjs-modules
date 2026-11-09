import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  RepositoryModule,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { ListenedEntityFixture } from '../../__fixtures__/repository/entity/listened.entity.fixture.js';
import { TypeOrmSqliteRepositoryModule } from '../../sqlite/typeorm-sqlite-repository.module.js';

describe('TypeOrmRepository and entity listeners', () => {
  let moduleFixture: TestingModule;
  let listened: RepositoryInterface<ListenedEntityFixture>;

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
              entities: [{ key: 'listened', entity: ListenedEntityFixture }],
            },
          ],
        }),
      ],
    }).compile();
    listened = moduleFixture.get(getDynamicRepositoryToken('listened'));
  });

  afterEach(async () => {
    await moduleFixture.close();
  });

  it("runs the entity's own insert listener on create and createMany", async () => {
    const created = await listened.create({ name: 'one' });
    const [many] = await listened.createMany([{ name: 'two' }]);

    expect(created.stamp).toBe('listener');
    expect(many?.stamp).toBe('listener');
  });
});
