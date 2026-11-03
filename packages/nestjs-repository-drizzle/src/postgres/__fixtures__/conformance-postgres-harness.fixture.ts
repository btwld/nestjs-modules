import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import { type INestApplicationContext } from '@nestjs/common';
import { DrizzleModule, getDrizzleToken } from '@nestjs/drizzle';

import { type ConformanceHarnessInterface } from '@concepta/nestjs-repository/conformance';

import { DRIZZLE_DEFAULT_CONNECTION_NAME } from '../../drizzle-repository.constants.js';
import {
  DrizzlePostgresRepositoryModule,
  toDrizzlePostgresClient,
} from '../drizzle-postgres-repository.module.js';
import { type DrizzlePostgresClient } from '../drizzle-postgres.types.js';

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
} from './conformance-postgres.schema.fixture.js';

function database(app: INestApplicationContext): DrizzlePostgresClient {
  return toDrizzlePostgresClient(
    app.get(getDrizzleToken()),
    DRIZZLE_DEFAULT_CONNECTION_NAME,
  );
}

/**
 * The Drizzle Postgres adapter's conformance harness on PGlite: an
 * in-process Postgres, with the fixture tables created on startup.
 */
export function drizzlePostgresConformanceHarness(): ConformanceHarnessInterface<
  typeof DrizzlePostgresRepositoryModule
> {
  return {
    name: 'drizzle-postgres/pglite',
    driver: DrizzlePostgresRepositoryModule,
    imports: [
      DrizzleModule.forRootAsync({
        useFactory: async () => {
          const db = drizzle({ client: new PGlite() });
          await createConformanceSchema(
            toDrizzlePostgresClient(db, DRIZZLE_DEFAULT_CONNECTION_NAME),
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
    },
    async reset(app) {
      const db = database(app);
      for (const table of CONFORMANCE_TABLES) {
        await db.delete(table);
      }
    },
  };
}
