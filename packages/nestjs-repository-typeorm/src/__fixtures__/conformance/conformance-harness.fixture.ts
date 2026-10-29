import { type DataSource, type DataSourceOptions } from 'typeorm';

import { type INestApplicationContext } from '@nestjs/common';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';

import { type ConformanceHarnessInterface } from '@concepta/nestjs-repository/conformance';

import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';

import {
  CONFORMANCE_ENTITIES,
  ConformanceAuthorEntity,
  ConformanceBookEntity,
  ConformanceBookWithEagerAuthorEntity,
  ConformanceItemEntity,
  ConformancePlainItemEntity,
  ConformanceTagEntity,
  ConformanceTenantOrderEntity,
  ConformanceTenantOrderLineEntity,
} from './conformance.entity.fixture.js';

/** Every table, children before the rows they refer to. */
const TABLES = [
  'conformance_book_tag',
  'conformance_tenant_order_line',
  'conformance_tenant_order',
  'conformance_book',
  'conformance_book_with_eager_author',
  'conformance_tag',
  'conformance_author',
  'conformance_item',
  'conformance_plain_item',
];

/**
 * The TypeORM driver's conformance harness for one database: the
 * connection, and the driver's entity for each fixture.
 */
export function typeOrmConformanceHarness(
  name: string,
  connection: DataSourceOptions,
): ConformanceHarnessInterface<typeof TypeOrmRepositoryModule> {
  const dataSource = (app: INestApplicationContext): DataSource =>
    app.get<DataSource>(getDataSourceToken());

  return {
    name,
    driver: TypeOrmRepositoryModule,
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
      author: { key: 'conformance-author', entity: ConformanceAuthorEntity },
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
      eagerResults: 'supported',
      referentialIntegrity: 'supported',
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
