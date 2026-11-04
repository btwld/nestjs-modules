import { drizzle } from 'drizzle-orm/better-sqlite3';

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
import {
  DrizzleSqliteRepositoryModule,
  toDrizzleSqliteClient,
} from '../drizzle-sqlite-repository.module.js';
import { type DrizzleSqliteClient } from '../drizzle-sqlite.types.js';

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
} from './conformance-sqlite.schema.fixture.js';

function database(app: INestApplicationContext): DrizzleSqliteClient {
  return toDrizzleSqliteClient(
    app.get(getDrizzleToken()),
    DRIZZLE_DEFAULT_CONNECTION_NAME,
  );
}

/**
 * The Drizzle SQLite adapter's conformance harness on an in-memory
 * better-sqlite3 database, with the fixture tables created on startup.
 */
export function drizzleSqliteConformanceHarness(): ConformanceHarnessInterface<
  typeof DrizzleSqliteRepositoryModule
> {
  return {
    name: 'drizzle-sqlite/better-sqlite3',
    driver: DrizzleSqliteRepositoryModule,
    imports: [
      DrizzleModule.forRootAsync({
        useFactory: () => {
          const db = drizzle(':memory:');
          createConformanceSchema(
            toDrizzleSqliteClient(db, DRIZZLE_DEFAULT_CONNECTION_NAME),
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
      concurrentTransactions: 'refused',
    },
    async reset(app) {
      const db = database(app);
      for (const table of CONFORMANCE_TABLES) {
        await db.delete(table);
      }
    },
  };
}
