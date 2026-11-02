import { type Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppContextHost } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  type RepositoryDriverInterface,
  RepositoryModule,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { TypeOrmPostgresRepositoryModule } from '../postgres/typeorm-postgres-repository.module.js';
import { TypeOrmSqliteRepository } from '../sqlite/typeorm-sqlite-repository.js';
import { TypeOrmSqliteRepositoryModule } from '../sqlite/typeorm-sqlite-repository.module.js';
import { TypeOrmSqliteTransaction } from '../sqlite/typeorm-sqlite-transaction.js';

import { ormConfig } from '../__fixtures__/repository/config/ormconfig.fixture.js';
import { TestEntityFixture } from '../__fixtures__/repository/entity/test.entity.fixture.js';

/** An application with one entity, registered with `driver`, on SQLite. */
function compile(driver: RepositoryDriverInterface & Type) {
  return Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot(ormConfig),
      RepositoryModule.forRoot({
        drivers: [
          { driver, entities: [{ key: 'test', entity: TestEntityFixture }] },
        ],
      }),
    ],
  }).compile();
}

describe('TypeORM adapter modules', () => {
  it("builds the adapter's repositories, joining its own transactions", async () => {
    const app = await compile(TypeOrmSqliteRepositoryModule);
    const repository = app.get(getDynamicRepositoryToken('test'));

    expect(repository).toBeInstanceOf(TypeOrmSqliteRepository);
    expect(repository.transactionKey).toBe('typeorm-sqlite:default');

    await app.get(TransactionScope).run(new AppContextHost(), async (ctx) => {
      const tx = await ctx.trx.getOrStart('typeorm-sqlite:default');
      expect(tx).toBeInstanceOf(TypeOrmSqliteTransaction);
    });

    await app.close();
  });

  it('refuses at startup a data source of another database', async () => {
    await expect(compile(TypeOrmPostgresRepositoryModule)).rejects.toThrow(
      'uses a "better-sqlite3" data source, but its TypeORM adapter is for ' +
        '"postgres"',
    );
  });
});
