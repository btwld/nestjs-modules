import { type PlainLiteralObject } from '@nestjs/common';

import { type DynamicRepositoryModule } from '../../interfaces/repository-module.interface.js';
import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
import { type ConformanceAuthorInterface } from '../interfaces/conformance-author.interface.js';
import { type ConformanceAwardInterface } from '../interfaces/conformance-award.interface.js';
import { type ConformanceBookWithEagerAuthorInterface } from '../interfaces/conformance-book-with-eager-author.interface.js';
import { type ConformanceBookInterface } from '../interfaces/conformance-book.interface.js';
import { type ConformanceCapabilitiesInterface } from '../interfaces/conformance-capabilities.interface.js';
import {
  type ConformanceFixtureBindings,
  type ConformanceHarnessInterface,
} from '../interfaces/conformance-harness.interface.js';
import { type ConformanceItemInterface } from '../interfaces/conformance-item.interface.js';
import { type ConformancePlainItemInterface } from '../interfaces/conformance-plain-item.interface.js';
import { type ConformanceTagInterface } from '../interfaces/conformance-tag.interface.js';
import { type ConformanceTenantOrderLineInterface } from '../interfaces/conformance-tenant-order-line.interface.js';
import { type ConformanceTenantOrderInterface } from '../interfaces/conformance-tenant-order.interface.js';
import { type ConformanceTestApiInterface } from '../interfaces/conformance-test-api.interface.js';
import { type ConformanceUniqueItemInterface } from '../interfaces/conformance-unique-item.interface.js';
import { runRepositoryConformance } from '../run-repository-conformance.js';

class StubDriver {
  static register(
    _entities: RepositoryProviderOptions[],
    _options?: PlainLiteralObject,
  ): DynamicRepositoryModule {
    return { module: StubDriver };
  }
}

class Item implements ConformanceItemInterface {
  declare id: number;
  declare name: string;
  declare rank: number | null;
  declare note: string | null;
  declare removedAt: Date | null;
  declare version: number;
}
class PlainItem implements ConformancePlainItemInterface {
  declare id: number;
  declare name: string;
}
class UniqueItem implements ConformanceUniqueItemInterface {
  declare id: string;
  declare code: string;
  declare name: string;
  declare version: number;
}
class Author implements ConformanceAuthorInterface {
  declare id: string;
  declare name: string;
  declare removedAt: Date | null;
}
class Award implements ConformanceAwardInterface {
  declare id: string;
  declare name: string;
  declare authorId: string | null;
}
class Book implements ConformanceBookInterface {
  declare id: string;
  declare title: string;
  declare authorId: string | null;
  declare removedAt: Date | null;
}
class BookWithEagerAuthor implements ConformanceBookWithEagerAuthorInterface {
  declare id: string;
  declare title: string;
  declare authorId: string | null;
  declare removedAt: Date | null;
}
class Tag implements ConformanceTagInterface {
  declare id: string;
  declare label: string;
}
class TenantOrder implements ConformanceTenantOrderInterface {
  declare id: string;
  declare tenantId: string;
  declare total: number;
}
class TenantOrderLine implements ConformanceTenantOrderLineInterface {
  declare id: string;
  declare tenantId: string;
  declare orderId: string;
  declare qty: number;
}

const FIXTURES: ConformanceFixtureBindings<typeof StubDriver> = {
  item: { key: 'item', entity: Item },
  plainItem: { key: 'plain-item', entity: PlainItem },
  uniqueItem: { key: 'unique-item', entity: UniqueItem },
  author: { key: 'author', entity: Author },
  award: { key: 'award', entity: Award },
  book: { key: 'book', entity: Book },
  bookWithEagerAuthor: {
    key: 'book-with-eager-author',
    entity: BookWithEagerAuthor,
    allowEagerRelations: true,
  },
  tag: { key: 'tag', entity: Tag },
  tenantOrder: { key: 'tenant-order', entity: TenantOrder },
  tenantOrderLine: { key: 'tenant-order-line', entity: TenantOrderLine },
};

function harness(
  capabilities: ConformanceCapabilitiesInterface,
): ConformanceHarnessInterface<typeof StubDriver> {
  return {
    name: 'stub',
    driver: StubDriver,
    fixtures: FIXTURES,
    capabilities,
    reset: async () => undefined,
    linkBookTag: async () => undefined,
  };
}

interface Registered {
  path: string[];
  hooks: string[];
}

/**
 * Register the suite against a runner that records what it is given, and
 * runs nothing.
 */
function register(capabilities: ConformanceCapabilitiesInterface): {
  describes: string[][];
  cases: string[][];
  hooks: Registered[];
} {
  const describes: string[][] = [];
  const cases: string[][] = [];
  const hooks: Registered[] = [];
  const path: string[] = [];
  const hook = (name: string) => () => {
    hooks.push({ path: [...path], hooks: [name] });
  };

  const test: ConformanceTestApiInterface = {
    describe: (name, fn) => {
      path.push(name);
      describes.push([...path]);
      fn();
      path.pop();
    },
    it: (name) => {
      cases.push([...path, name]);
    },
    beforeAll: hook('beforeAll'),
    afterAll: hook('afterAll'),
    beforeEach: hook('beforeEach'),
  };

  runRepositoryConformance(harness(capabilities), test);

  return { describes, cases, hooks };
}

const ALL_SUPPORTED: ConformanceCapabilitiesInterface = {
  transactions: 'supported',
  concurrentTransactions: 'supported',
  relations: 'supported',
  eagerResults: 'supported',
  referentialIntegrity: 'supported',
  deferredReferences: 'supported',
  softDelete: 'supported',
};
const ALL_REFUSED: ConformanceCapabilitiesInterface = {
  transactions: 'refused',
  concurrentTransactions: 'refused',
  relations: 'refused',
  eagerResults: 'refused',
  referentialIntegrity: 'refused',
  deferredReferences: 'refused',
  softDelete: 'refused',
};

const caseNames = (cases: string[][], section: string): string[] =>
  cases
    .filter((path) => path[1] === section)
    .map((path) => path[path.length - 1]);

describe(runRepositoryConformance.name, () => {
  it('registers every section under the harness name', () => {
    const { describes } = register(ALL_SUPPORTED);

    expect(
      describes
        .filter((path) => path.length <= 2)
        .map((path) => path.join(' > ')),
    ).toEqual([
      'repository conformance: stub',
      'repository conformance: stub > metadata',
      'repository conformance: stub > read translation',
      'repository conformance: stub > counts',
      'repository conformance: stub > writes',
      'repository conformance: stub > transactions',
      'repository conformance: stub > eager results',
      'repository conformance: stub > errors',
    ]);
  });

  it('builds the application once and resets it before every case', () => {
    const { hooks } = register(ALL_SUPPORTED);

    expect(
      hooks
        .filter(({ path }) => path.length === 1)
        .map(({ hooks }) => hooks[0]),
    ).toEqual(['beforeAll', 'afterAll', 'beforeEach']);
  });

  it('registers cases in every section', () => {
    for (const capabilities of [ALL_SUPPORTED, ALL_REFUSED]) {
      const { cases } = register(capabilities);

      for (const section of [
        'metadata',
        'read translation',
        'counts',
        'writes',
        'transactions',
        'eager results',
        'errors',
      ]) {
        expect(caseNames(cases, section).length).toBeGreaterThan(0);
      }
    }
  });

  it('runs the refusal cases, not the positive ones, for a refused capability', () => {
    const supported = register(ALL_SUPPORTED).cases;
    const refused = register(ALL_REFUSED).cases;

    expect(caseNames(supported, 'transactions')).toContain(
      'transactions: a run that throws leaves none of its writes',
    );
    expect(caseNames(refused, 'transactions')).toEqual([
      'transactions: a run has no transaction',
      'transactions: a run that throws keeps the writes made before it',
    ]);

    expect(caseNames(supported, 'eager results')).toEqual([
      'eager results: a read not opted in loads no eager relation',
      'eager results: an opted-in read holds the eager relation without a join',
    ]);
    expect(caseNames(refused, 'eager results')).toEqual([
      'eager results: a read not opted in loads no eager relation',
      'eager results: an opted-in read loads no eager relation',
    ]);

    expect(caseNames(supported, 'errors')).toEqual([
      'doCreateMany: a key given twice is refused',
      'doDelete: a row other rows refer to is not deleted',
      'doCreate: a reference naming no row is refused',
    ]);
    expect(caseNames(refused, 'errors')).toEqual([
      'doCreateMany: a key given twice is refused',
    ]);
  });

  it('leaves out exactly the soft-delete cases when soft delete is refused', () => {
    const names = (capabilities: ConformanceCapabilitiesInterface) =>
      register(capabilities).cases.map((path) => path.slice(1).join(' > '));
    const supported = names(ALL_SUPPORTED);
    const refused = names({ ...ALL_SUPPORTED, softDelete: 'refused' });

    expect(supported.filter((name) => !refused.includes(name))).toEqual([
      'read translation > items > doFind: leaves out soft-deleted rows unless asked for them',
      'read translation > joins > doFind: leaves soft-deleted related rows out of a join unless asked for them',
      'counts > items > doCount: counts soft-deleted rows only when asked for them',
      'counts > joins > doCount: a joined filter leaves out soft-deleted related rows unless asked for them',
      'writes > doSoftDelete and doRestore: set and clear the remove date',
      'writes > doRestore: leaves a live row live',
      'writes > doDelete and doDeleteMany: remove soft-deleted rows too',
      'transactions > doSoftDelete: changes the version, and refuses a stale row',
      'transactions > doRestore: changes the version, and refuses a stale row',
    ]);
    expect(refused.filter((name) => !supported.includes(name))).toEqual([]);
  });

  it('leaves out exactly the relation cases when relations are refused', () => {
    const names = (capabilities: ConformanceCapabilitiesInterface) =>
      register(capabilities).cases.map((path) => path.slice(1).join(' > '));
    const supported = names(ALL_SUPPORTED);
    const refused = names({ ...ALL_SUPPORTED, relations: 'refused' });
    const joined = supported.filter((name) =>
      /^(read translation|counts) > (joins|composite foreign keys) > /.test(
        name,
      ),
    );

    expect(joined).toHaveLength(31);
    expect(supported.filter((name) => !refused.includes(name))).toEqual([
      'metadata > metadata: reports exactly the declared relations',
      "metadata > metadata: reports each relation's target by its URN and own columns",
      'metadata > metadata: reports a to-one relation by the foreign key it holds',
      'metadata > metadata: reports the to-many side of a foreign key swapped, holding none',
      'metadata > metadata: reports both sides of a many-to-many relation through one junction',
      'metadata > metadata: reports every column pair of a composite foreign key',
      ...joined,
      'writes > doUpdate: a new foreign key shows in a later join',
    ]);
    expect(refused.filter((name) => !supported.includes(name))).toEqual([
      'metadata > metadata: reports no relations',
    ]);
  });

  it('leaves out exactly the overlapping-transaction cases when concurrent transactions are refused', () => {
    const names = (capabilities: ConformanceCapabilitiesInterface) =>
      register(capabilities).cases.map((path) => path.slice(1).join(' > '));
    const supported = names(ALL_SUPPORTED);
    const refused = names({
      ...ALL_SUPPORTED,
      concurrentTransactions: 'refused',
    });

    expect(supported.filter((name) => !refused.includes(name))).toEqual([
      'transactions > overlapping transactions: a versioned write of a row another run has changed since it read it is refused',
      'transactions > overlapping transactions: a write in a run that has read returns the row as stored, not as the run read it',
      'transactions > overlapping transactions: an upsert in a run that has read returns the row as stored, not as the run read it',
      'transactions > overlapping transactions: a versioned write of values another run stored since this run read returns the row as stored',
      'transactions > overlapping transactions: a run that catches a deadlock keeps all of its writes or none',
      'transactions > overlapping transactions: runs that upsert the same new key at once leave one row',
      'transactions > overlapping transactions: runs that upsert the same stored key at once move the version once per write kept',
      'transactions > overlapping transactions: runs that read the same versioned row, then each write it, keep exactly one write',
    ]);
    expect(refused.filter((name) => !supported.includes(name))).toEqual([]);
  });

  it('leaves out exactly the refused-commit case when deferred references are refused', () => {
    const names = (capabilities: ConformanceCapabilitiesInterface) =>
      register(capabilities).cases.map((path) => path.slice(1).join(' > '));
    const supported = names(ALL_SUPPORTED);
    const refused = names({ ...ALL_SUPPORTED, deferredReferences: 'refused' });

    expect(supported.filter((name) => !refused.includes(name))).toEqual([
      'transactions > transactions: a run whose commit the store refuses keeps none of its writes, and the next run commits',
    ]);
    expect(refused.filter((name) => !supported.includes(name))).toEqual([]);
  });

  it('gives every case a unique name', () => {
    for (const capabilities of [ALL_SUPPORTED, ALL_REFUSED]) {
      const names = register(capabilities).cases.map((path) =>
        path.join(' > '),
      );

      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('refuses at compile time a harness missing a fixture or the eager opt-in', () => {
    const { tag: _tag, ...missingTag } = FIXTURES;

    // @ts-expect-error every fixture key must be mapped
    const missing: ConformanceFixtureBindings<typeof StubDriver> = missingTag;

    const notOptedIn: ConformanceFixtureBindings<typeof StubDriver> = {
      ...FIXTURES,
      // @ts-expect-error the eager fixture must opt in to eager results
      bookWithEagerAuthor: {
        key: 'book-with-eager-author',
        entity: BookWithEagerAuthor,
      },
    };

    const wrongShape: ConformanceFixtureBindings<typeof StubDriver> = {
      ...FIXTURES,
      // @ts-expect-error an entity must have its fixture's shape
      item: { key: 'item', entity: PlainItem },
    };

    // @ts-expect-error every capability must be declared
    const partial: ConformanceCapabilitiesInterface = {
      transactions: 'supported',
    };

    expect([missing, notOptedIn, wrongShape, partial]).toHaveLength(4);
  });
});
