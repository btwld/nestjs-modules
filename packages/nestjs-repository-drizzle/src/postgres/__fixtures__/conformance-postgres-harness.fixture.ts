import { type INestApplicationContext } from '@nestjs/common';
import { DrizzleModule, getDrizzleToken } from '@nestjs/drizzle';

import {
  type ConformanceCapability,
  type ConformanceHarnessInterface,
} from '@concepta/nestjs-repository/conformance';

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
  DrizzlePostgresRepositoryModule,
  toDrizzlePostgresClient,
} from '../drizzle-postgres-repository.module.js';
import { type DrizzlePostgresClient } from '../drizzle-postgres.types.js';

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
} from './conformance-postgres.schema.fixture.js';
import { type DrizzlePostgresConnect } from './drizzle-postgres-connect.type.js';

function database(app: INestApplicationContext): DrizzlePostgresClient {
  return toDrizzlePostgresClient(
    app.get(getDrizzleToken()),
    DRIZZLE_DEFAULT_CONNECTION_NAME,
  );
}

/**
 * The Drizzle Postgres adapter's conformance harness on the database
 * `connect` creates, with the fixture tables created afresh on startup.
 *
 * @param name - Names the run
 * @param connect - Creates the database the run uses
 * @param concurrentTransactions - Whether the database runs transactions
 *   at the same time; one with a single connection refuses it
 */
export function drizzlePostgresConformanceHarness(
  name: string,
  connect: DrizzlePostgresConnect,
  concurrentTransactions: ConformanceCapability = 'supported',
): ConformanceHarnessInterface<typeof DrizzlePostgresRepositoryModule> {
  return {
    name,
    driver: DrizzlePostgresRepositoryModule,
    imports: [
      DrizzleModule.forRootAsync({
        useFactory: async () => {
          const db = connect({});
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
      deferredReferences: 'supported',
      softDelete: 'supported',
      concurrentTransactions,
    },
    async reset(app) {
      const db = database(app);
      for (const table of CONFORMANCE_TABLES) {
        await db.delete(table);
      }
    },
  };
}
