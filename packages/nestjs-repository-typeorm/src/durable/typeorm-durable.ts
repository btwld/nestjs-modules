import { type DataSource } from 'typeorm';

import { Injectable, type PlainLiteralObject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  fromTypeOrm as mySqlExecutor,
  MySqlOutboxStore,
} from '@nestjs/outbox/mysql';
import {
  fromTypeOrm as postgresExecutor,
  PostgresOutboxStore,
} from '@nestjs/outbox/postgres';
import { getDataSourceToken } from '@nestjs/typeorm';

import { type RepositoryInterface } from '@concepta/nestjs-repository';
import {
  type DurableDriverInterface,
  UnsupportedDurableDriverException,
} from '@concepta/nestjs-repository/optional/outbox';

import { TypeOrmRepository } from '../repository/typeorm-repository.js';
import { resolveTokenName } from '../typeorm-repository.util.js';

/**
 * Durable messaging for TypeORM registrations: an `@nestjs/outbox` store on
 * the registration's own data source, `PostgresOutboxStore` for `postgres`
 * and `MySqlOutboxStore` for `mysql`. Any other database, MariaDB included,
 * has no store and is refused.
 *
 * Pass the class to `DurableMessagingModule.forRoot({ driver })`; the module
 * provides it. The data source is resolved from the TypeORM module's own
 * provider, so the repository never hands it out.
 */
@Injectable()
export class TypeOrmDurable implements DurableDriverInterface {
  constructor(private readonly moduleRef: ModuleRef) {}

  bind(
    repository: RepositoryInterface<PlainLiteralObject>,
  ): ReturnType<DurableDriverInterface['bind']> {
    if (!(repository instanceof TypeOrmRepository)) {
      throw new UnsupportedDurableDriverException(
        repository.metadata.name,
        'its repository is not a TypeORM repository',
      );
    }

    const { transactionKey } = repository;

    if (!transactionKey) {
      throw new UnsupportedDurableDriverException(
        repository.entityKey,
        'its repository was built without a transaction',
      );
    }

    const dataSource = this.moduleRef.get<DataSource>(
      getDataSourceToken(resolveTokenName(repository.dataSourceName)),
      { strict: false },
    );
    const { type } = dataSource.options;

    switch (type) {
      case 'postgres':
        return {
          transactionKey,
          store: new PostgresOutboxStore({
            executor: postgresExecutor(dataSource),
          }),
        };
      case 'mysql':
        return {
          transactionKey,
          store: new MySqlOutboxStore({ executor: mySqlExecutor(dataSource) }),
        };
      default:
        throw new UnsupportedDurableDriverException(
          repository.entityKey,
          `@nestjs/outbox has no store for the ${type} database`,
        );
    }
  }
}
