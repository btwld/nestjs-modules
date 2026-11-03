import { NestFactory } from '@nestjs/core';

import { CoreModule } from '@concepta/nestjs-core';

import { type RepositoryDriverInterface } from '../interfaces/repository-module.interface.js';
import { RepositoryModule } from '../repository.module.js';

import { ConformanceContext } from './conformance-context.js';
import { ConformanceRootModule } from './conformance-root.module.js';
import { type ConformanceHarnessInterface } from './interfaces/conformance-harness.interface.js';
import { type ConformanceTestApiInterface } from './interfaces/conformance-test-api.interface.js';
import { countsSection } from './sections/counts.section.js';
import { eagerResultsSection } from './sections/eager-results.section.js';
import { errorsSection } from './sections/errors.section.js';
import { metadataSection } from './sections/metadata.section.js';
import { readTranslationSection } from './sections/read-translation.section.js';
import { transactionsSection } from './sections/transactions.section.js';
import { writesSection } from './sections/writes.section.js';

/**
 * Every section of the driver contract. All of them run for every harness;
 * a driver cannot pick.
 */
const SECTIONS: Record<string, (ctx: ConformanceContext) => void> = {
  metadata: metadataSection,
  'read translation': readTranslationSection,
  counts: countsSection,
  writes: writesSection,
  transactions: transactionsSection,
  'eager results': eagerResultsSection,
  errors: errorsSection,
};

/**
 * Register the repository driver contract with a test runner, run against
 * one harness: one database, with every fixture the suite defines.
 *
 * @example
 * ```typescript
 * runRepositoryConformance(postgresHarness, {
 *   describe, it, beforeAll, afterAll, beforeEach,
 * });
 * ```
 */
export function runRepositoryConformance<
  Driver extends RepositoryDriverInterface,
>(
  harness: ConformanceHarnessInterface<Driver>,
  test: ConformanceTestApiInterface,
): void {
  const { fixtures } = harness;

  const ctx = new ConformanceContext(
    {
      name: harness.name,
      capabilities: harness.capabilities,
      fixtures: {
        item: fixtures.item,
        plainItem: fixtures.plainItem,
        author: fixtures.author,
        award: fixtures.award,
        book: fixtures.book,
        bookWithEagerAuthor: fixtures.bookWithEagerAuthor,
        tag: fixtures.tag,
        tenantOrder: fixtures.tenantOrder,
        tenantOrderLine: fixtures.tenantOrderLine,
      },
      createApp: () =>
        NestFactory.createApplicationContext(
          {
            module: ConformanceRootModule,
            imports: [
              CoreModule.forRoot(),
              ...(harness.imports ?? []),
              RepositoryModule.forRoot({
                drivers: [
                  {
                    driver: harness.driver,
                    entities: [
                      fixtures.item,
                      fixtures.plainItem,
                      fixtures.author,
                      fixtures.award,
                      fixtures.book,
                      fixtures.bookWithEagerAuthor,
                      fixtures.tag,
                      fixtures.tenantOrder,
                      fixtures.tenantOrderLine,
                    ],
                    options: harness.driverOptions,
                  },
                ],
              }),
            ],
          },
          // Throw a startup failure into the test run instead of exiting.
          { abortOnError: false },
        ),
      reset: (app) => harness.reset(app),
      linkBookTag: harness.linkBookTag?.bind(harness),
    },
    test,
  );

  test.describe(`repository conformance: ${harness.name}`, () => {
    test.beforeAll(() => ctx.start());
    test.afterAll(() => ctx.stop());
    test.beforeEach(() => ctx.reset());

    for (const [name, section] of Object.entries(SECTIONS)) {
      test.describe(name, () => section(ctx));
    }
  });
}
