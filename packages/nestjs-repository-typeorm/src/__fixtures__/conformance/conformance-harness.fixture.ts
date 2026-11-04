import { type DataSource, type DataSourceOptions } from 'typeorm';

import { type INestApplicationContext } from '@nestjs/common';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';

import {
  type ConformanceCapability,
  type ConformanceHarnessInterface,
} from '@concepta/nestjs-repository/conformance';

import { type TypeOrmMariadbRepositoryModule } from '../../mariadb/typeorm-mariadb-repository.module.js';
import { type TypeOrmMysqlRepositoryModule } from '../../mysql/typeorm-mysql-repository.module.js';
import { type TypeOrmOracleRepositoryModule } from '../../oracle/typeorm-oracle-repository.module.js';
import { type TypeOrmPostgresRepositoryModule } from '../../postgres/typeorm-postgres-repository.module.js';
import { type TypeOrmSqliteRepositoryModule } from '../../sqlite/typeorm-sqlite-repository.module.js';
import { type TypeOrmSqlServerRepositoryModule } from '../../sqlserver/typeorm-sqlserver-repository.module.js';

import {
  CONFORMANCE_ENTITIES,
  ConformanceAuthorEntity,
  ConformanceAwardEntity,
  ConformanceBookEntity,
  ConformanceBookWithEagerAuthorEntity,
  ConformanceItemEntity,
  ConformancePlainItemEntity,
  ConformanceTagEntity,
  ConformanceTenantOrderEntity,
  ConformanceTenantOrderLineEntity,
  ConformanceUniqueItemEntity,
} from './conformance.entity.fixture.js';

/** Every table, children before the rows they refer to. */
const TABLES = [
  'conformance_book_tag',
  'conformance_tenant_order_line',
  'conformance_tenant_order',
  'conformance_book',
  'conformance_book_with_eager_author',
  'conformance_award',
  'conformance_tag',
  'conformance_author',
  'conformance_item',
  'conformance_plain_item',
  'conformance_unique_item',
];

/** The adapters whose conformance this harness runs. */
type TypeOrmAdapterModule =
  | typeof TypeOrmPostgresRepositoryModule
  | typeof TypeOrmMysqlRepositoryModule
  | typeof TypeOrmMariadbRepositoryModule
  | typeof TypeOrmOracleRepositoryModule
  | typeof TypeOrmSqlServerRepositoryModule
  | typeof TypeOrmSqliteRepositoryModule;

/**
 * A TypeORM adapter's conformance harness for its database: the adapter,
 * the connection, and the adapter's entity for each fixture.
 *
 * @param name - Names the run
 * @param driver - The adapter's module
 * @param connection - The data source the run uses
 * @param capabilities - What the database refuses or provides beyond the
 *   default: a database with a single connection refuses
 *   `concurrentTransactions`; one TypeORM writes deferrable references for
 *   (Postgres, SQLite) supports `deferredReferences`
 */
export function typeOrmConformanceHarness(
  name: string,
  driver: TypeOrmAdapterModule,
  connection: DataSourceOptions,
  capabilities: Partial<
    Record<
      'concurrentTransactions' | 'deferredReferences',
      ConformanceCapability
    >
  > = {},
): ConformanceHarnessInterface<TypeOrmAdapterModule> {
  const dataSource = (app: INestApplicationContext): DataSource =>
    app.get<DataSource>(getDataSourceToken());

  return {
    name,
    driver,
    imports: [
      TypeOrmModule.forRoot({
        ...connection,
        entities: CONFORMANCE_ENTITIES,
        synchronize: true,
      }),
    ],
    fixtures: {
      item: { key: 'conformance-item', entity: ConformanceItemEntity },
      plainItem: {
        key: 'conformance-plain-item',
        entity: ConformancePlainItemEntity,
      },
      uniqueItem: {
        key: 'conformance-unique-item',
        entity: ConformanceUniqueItemEntity,
      },
      author: { key: 'conformance-author', entity: ConformanceAuthorEntity },
      award: { key: 'conformance-award', entity: ConformanceAwardEntity },
      book: { key: 'conformance-book', entity: ConformanceBookEntity },
      bookWithEagerAuthor: {
        key: 'conformance-book-with-eager-author',
        entity: ConformanceBookWithEagerAuthorEntity,
        allowEagerRelations: true,
      },
      tag: { key: 'conformance-tag', entity: ConformanceTagEntity },
      tenantOrder: {
        key: 'conformance-tenant-order',
        entity: ConformanceTenantOrderEntity,
      },
      tenantOrderLine: {
        key: 'conformance-tenant-order-line',
        entity: ConformanceTenantOrderLineEntity,
      },
    },
    capabilities: {
      transactions: 'supported',
      concurrentTransactions:
        capabilities.concurrentTransactions ?? 'supported',
      relations: 'supported',
      eagerResults: 'supported',
      referentialIntegrity: 'supported',
      deferredReferences: capabilities.deferredReferences ?? 'refused',
      softDelete: 'supported',
    },
    async reset(app) {
      for (const table of TABLES) {
        await dataSource(app)
          .createQueryBuilder()
          .delete()
          .from(table)
          .execute();
      }
    },
    async linkBookTag(app, { bookId, tagId }) {
      await dataSource(app)
        .createQueryBuilder()
        .relation(ConformanceTagEntity, 'books')
        .of(tagId)
        .add(bookId);
    },
  };
}
