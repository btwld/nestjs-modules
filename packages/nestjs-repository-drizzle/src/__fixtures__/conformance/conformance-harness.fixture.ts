import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import { type INestApplicationContext } from '@nestjs/common';
import { DrizzleModule, getDrizzleToken } from '@nestjs/drizzle';

import { type ConformanceHarnessInterface } from '@concepta/nestjs-repository/conformance';

import { DRIZZLE_DEFAULT_CONNECTION_NAME } from '../../drizzle-repository.constants.js';
import { DrizzleRepositoryModule } from '../../drizzle-repository.module.js';
import { type DrizzleClient } from '../../drizzle-repository.types.js';
import { toDrizzleClient } from '../../drizzle-repository.util.js';

import {
  bookTagTable,
  ConformanceAuthorEntity,
  ConformanceBookEntity,
  ConformanceBookWithEagerAuthorEntity,
  ConformanceItemEntity,
  ConformancePlainItemEntity,
  conformanceRelations,
  ConformanceTagEntity,
  ConformanceTenantOrderEntity,
  ConformanceTenantOrderLineEntity,
  CONFORMANCE_TABLES,
  createConformanceSchema,
  authorTable,
  bookTable,
  bookWithEagerAuthorTable,
  itemTable,
  plainItemTable,
  tagTable,
  tenantOrderLineTable,
  tenantOrderTable,
} from './conformance.schema.fixture.js';

function database(app: INestApplicationContext): DrizzleClient {
  return toDrizzleClient(
    app.get(getDrizzleToken()),
    DRIZZLE_DEFAULT_CONNECTION_NAME,
  );
}

/**
 * The Drizzle driver's conformance harness on PGlite: an in-process
 * Postgres, with the fixture tables created on startup.
 */
export function drizzleConformanceHarness(): ConformanceHarnessInterface<
  typeof DrizzleRepositoryModule
> {
  return {
    name: 'drizzle/pglite',
    driver: DrizzleRepositoryModule,
    imports: [
      DrizzleModule.forRootAsync({
        useFactory: async () => {
          const db = drizzle({
            client: new PGlite(),
            relations: conformanceRelations,
          });
          await createConformanceSchema(
            toDrizzleClient(db, DRIZZLE_DEFAULT_CONNECTION_NAME),
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
      author: {
        key: 'conformance-author',
        entity: ConformanceAuthorEntity,
        table: authorTable,
        removeDate: 'removedAt',
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
      eagerResults: 'refused',
      referentialIntegrity: 'supported',
    },
    async reset(app) {
      const db = database(app);
      for (const table of CONFORMANCE_TABLES) {
        await db.delete(table);
      }
    },
    async linkBookTag(app, { bookId, tagId }) {
      await database(app).insert(bookTagTable).values({ bookId, tagId });
    },
  };
}
