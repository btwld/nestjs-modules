import { DataSource } from 'typeorm';
import { mock, mockDeep } from 'vitest-mock-extended';

import { type PlainLiteralObject } from '@nestjs/common';
import { type ModuleRef } from '@nestjs/core';
import { MySqlOutboxStore } from '@nestjs/outbox/mysql';
import { PostgresOutboxStore } from '@nestjs/outbox/postgres';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  type RepositoryAdapter,
} from '@concepta/nestjs-repository';
import {
  DurableMessagingModule,
  UnsupportedDurableDriverException,
} from '@concepta/nestjs-repository/optional/outbox';

import { TEST_ENTITY_TOKEN } from '../../__fixtures__/repository/config/test.constants.fixture.js';
import { TestEntityFixture } from '../../__fixtures__/repository/entity/test.entity.fixture.js';
import { AppModuleFixture } from '../../__fixtures__/repository/module/app.module.fixture.js';
import { type TypeOrmRepository } from '../../repository/typeorm-repository.js';
import { TypeOrmSqliteRepository } from '../../sqlite/typeorm-sqlite-repository.js';
import { TypeOrmDurable } from '../typeorm-durable.js';

describe(TypeOrmDurable.name, () => {
  describe('bind', () => {
    let app: TestingModule;
    // Typed as DurableMessagingModule hands it over: the binding map holds
    // repositories over plain objects.
    let repository: TypeOrmRepository<PlainLiteralObject>;

    beforeEach(async () => {
      app = await Test.createTestingModule({
        imports: [AppModuleFixture],
      }).compile();
      repository = app.get(getDynamicRepositoryToken(TEST_ENTITY_TOKEN));
    });

    afterEach(async () => {
      await app.close();
    });

    /** A driver whose ModuleRef resolves the given data source. */
    function durableResolving(dataSource: DataSource) {
      const moduleRef = mockDeep<ModuleRef>();
      moduleRef.get.mockReturnValue(dataSource);
      return { durable: new TypeOrmDurable(moduleRef), moduleRef };
    }

    it('builds a PostgresOutboxStore for a postgres data source', () => {
      const { durable, moduleRef } = durableResolving(
        new DataSource({ type: 'postgres' }),
      );

      const bound = durable.bind(repository);

      expect(bound.store).toBeInstanceOf(PostgresOutboxStore);
      expect(bound.transactionKey).toBe('typeorm-sqlite:default');
      expect(moduleRef.get).toHaveBeenCalledWith(getDataSourceToken(), {
        strict: false,
      });
    });

    it("resolves a named registration's own data source and transaction", () => {
      const { durable, moduleRef } = durableResolving(
        new DataSource({ type: 'postgres' }),
      );
      const named = new TypeOrmSqliteRepository<PlainLiteralObject>(
        app.get(DataSource).getRepository(TestEntityFixture),
        {
          entityKey: 'named',
          transactionKey: 'typeorm-sqlite:secondary',
          dataSourceName: 'secondary',
        },
      );

      expect(durable.bind(named).transactionKey).toBe(
        'typeorm-sqlite:secondary',
      );
      expect(moduleRef.get).toHaveBeenCalledWith(
        getDataSourceToken('secondary'),
        { strict: false },
      );
    });

    it.each<'mysql' | 'mariadb'>(['mysql', 'mariadb'])(
      'builds a MySqlOutboxStore for a %s data source',
      (type) => {
        const { durable } = durableResolving(new DataSource({ type }));

        expect(durable.bind(repository).store).toBeInstanceOf(MySqlOutboxStore);
      },
    );

    it('refuses a database @nestjs/outbox has no store for', () => {
      const { durable } = durableResolving(new DataSource({ type: 'oracle' }));

      expect(() => durable.bind(repository)).toThrow(
        '@nestjs/outbox has no store for the oracle database',
      );
    });

    it('refuses a repository that is not a TypeORM repository, naming its key', () => {
      const { durable } = durableResolving(
        new DataSource({ type: 'postgres' }),
      );
      const other = mock<RepositoryAdapter<PlainLiteralObject>>({
        entityKey: 'others',
        metadata: { name: 'OtherEntity' },
      });

      expect(() => durable.bind(other)).toThrow(
        UnsupportedDurableDriverException,
      );
      expect(() => durable.bind(other)).toThrow(
        'The "others" registration cannot carry durable messaging',
      );
    });

    it('refuses a repository built without a transaction', () => {
      const { durable } = durableResolving(
        new DataSource({ type: 'postgres' }),
      );
      const manual = new TypeOrmSqliteRepository<PlainLiteralObject>(
        app.get(DataSource).getRepository(TestEntityFixture),
        { entityKey: 'manual' },
      );

      expect(() => durable.bind(manual)).toThrow(
        'its repository was built without a transaction',
      );
    });
  });

  describe('in DurableMessagingModule', () => {
    it("resolves the registration's data source and refuses it when it has no store", async () => {
      // The fixture database is SQLite: the refusal naming it proves the
      // data source was resolved from the TypeORM module's own provider.
      await expect(
        Test.createTestingModule({
          imports: [
            AppModuleFixture,
            DurableMessagingModule.forRoot({
              key: TEST_ENTITY_TOKEN,
              driver: TypeOrmDurable,
              outbox: { relay: { enabled: false } },
            }),
          ],
        }).compile(),
      ).rejects.toThrow(
        '@nestjs/outbox has no store for the better-sqlite3 database',
      );
    });
  });
});
