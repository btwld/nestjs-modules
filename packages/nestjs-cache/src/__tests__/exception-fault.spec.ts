import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { CacheNotFoundException } from '../application/exceptions/cache-not-found.exception.js';
import { CacheInvalidExpiredDateException } from '../domain/exceptions/cache-invalid-expired-date.exception.js';
import { CacheException } from '../domain/exceptions/cache.exception.js';
import { CacheEntityNotFoundException } from '../infrastructure/exceptions/cache-entity-not-found.exception.js';

/**
 * Anti-drift check: every `RuntimeException` subclass in this package states
 * an expected `fault` here.
 */
const CASES: {
  name: string;
  build: () => RuntimeException;
  fault: RuntimeExceptionFault;
}[] = [
  {
    name: 'CacheException (default)',
    build: () => new CacheException(),
    fault: 'internal',
  },
  {
    name: 'CacheInvalidExpiredDateException',
    build: () => new CacheInvalidExpiredDateException(),
    fault: 'client',
  },
  {
    name: 'CacheNotFoundException',
    build: () => new CacheNotFoundException('id'),
    fault: 'client',
  },
  {
    name: 'CacheEntityNotFoundException',
    build: () => new CacheEntityNotFoundException('SomeEntity'),
    fault: 'usage',
  },
];

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

describe('exception fault classification', () => {
  it.each(CASES)('$name has fault=$fault', ({ build, fault }) => {
    expect(build().fault).toEqual(fault);
  });

  it('every RuntimeException subclass in this package is listed above', async () => {
    const discovered = await collectRuntimeExceptionClassNames(
      SRC_DIR,
      RuntimeException,
    );
    const expected = new Set(CASES.map((c) => c.build().constructor.name));
    const missing = discovered.filter((name) => !expected.has(name));
    expect(missing).toEqual([]);
  });
});
