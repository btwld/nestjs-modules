import { drizzle } from 'drizzle-orm/mysql2';

import { type INestApplicationContext } from '@nestjs/common';
import { DrizzleModule, getDrizzleToken } from '@nestjs/drizzle';

import { type ConformanceHarnessInterface } from '@concepta/nestjs-repository/conformance';

import {
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
} from '../../__fixtures__/conformance/conformance.entity.fixture.js';
import { DRIZZLE_DEFAULT_CONNECTION_NAME } from '../../drizzle-repository.constants.js';
import { toDrizzleMysqlClient } from '../drizzle-mysql-repository.module.js';
import { type DrizzleMysqlClient } from '../drizzle-mysql.types.js';

import {
  CONFORMANCE_TABLES,
  createConformanceSchema,
  authorTable,
  awardTable,
  bookTable,
  bookWithEagerAuthorTable,
  itemTable,
  plainItemTable,
  tagTable,
  tenantOrderLineTable,
  tenantOrderTable,
  uniqueItemTable,
} from './conformance-mysql.schema.fixture.js';
import { type DrizzleMysqlAdapterModule } from './drizzle-mysql-adapter-module.type.js';

function database(app: INestApplicationContext): DrizzleMysqlClient {
  return toDrizzleMysqlClient(
    app.get(getDrizzleToken()),
    DRIZZLE_DEFAULT_CONNECTION_NAME,
  );
}

/**
 * A Drizzle MySQL-protocol adapter's conformance harness on a database at
 * `url`, with the fixture tables created afresh on startup.
 */
export function drizzleMysqlConformanceHarness(
  name: string,
  driver: DrizzleMysqlAdapterModule,
  url: string,
): ConformanceHarnessInterface<DrizzleMysqlAdapterModule> {
  return {
    name,
    driver,
    imports: [
      DrizzleModule.forRootAsync({
        useFactory: async () => {
          const db = drizzle(url);
          await createConformanceSchema(
            toDrizzleMysqlClient(db, DRIZZLE_DEFAULT_CONNECTION_NAME),
          );
          return { db };
        },
      }),
    ],
    fixtures: {
      item: {
        key: 'conformance-item',
        entity: ConformanceItemEntity,
        table: itemTable,
        removeDate: 'removedAt',
        version: 'version',
      },
      plainItem: {
        key: 'conformance-plain-item',
        entity: ConformancePlainItemEntity,
        table: plainItemTable,
      },
      uniqueItem: {
        key: 'conformance-unique-item',
        entity: ConformanceUniqueItemEntity,
        table: uniqueItemTable,
        version: 'version',
      },
      author: {
        key: 'conformance-author',
        entity: ConformanceAuthorEntity,
        table: authorTable,
        removeDate: 'removedAt',
      },
      award: {
        key: 'conformance-award',
        entity: ConformanceAwardEntity,
        table: awardTable,
      },
      book: {
        key: 'conformance-book',
        entity: ConformanceBookEntity,
        table: bookTable,
        removeDate: 'removedAt',
      },
      bookWithEagerAuthor: {
        key: 'conformance-book-with-eager-author',
        entity: ConformanceBookWithEagerAuthorEntity,
        table: bookWithEagerAuthorTable,
        removeDate: 'removedAt',
        allowEagerRelations: true,
      },
      tag: {
        key: 'conformance-tag',
        entity: ConformanceTagEntity,
        table: tagTable,
      },
      tenantOrder: {
        key: 'conformance-tenant-order',
        entity: ConformanceTenantOrderEntity,
        table: tenantOrderTable,
      },
      tenantOrderLine: {
        key: 'conformance-tenant-order-line',
        entity: ConformanceTenantOrderLineEntity,
        table: tenantOrderLineTable,
      },
    },
    capabilities: {
      transactions: 'supported',
      relations: 'refused',
      eagerResults: 'refused',
      referentialIntegrity: 'supported',
      softDelete: 'supported',
      concurrentTransactions: 'supported',
    },
    async reset(app) {
      const db = database(app);
      for (const table of CONFORMANCE_TABLES) {
        await db.delete(table);
      }
    },
  };
}
