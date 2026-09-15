import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { OptimisticLockException } from '../exceptions/optimistic-lock.exception.js';
import { RepositoryDuplicateKeyException } from '../exceptions/repository-duplicate-key.exception.js';
import { RepositoryQueryException } from '../exceptions/repository-query.exception.js';
import { SoftDeletedImmutableException } from '../exceptions/soft-deleted-immutable.exception.js';
import { TransactionClosedException } from '../exceptions/transaction-closed.exception.js';
import { TransactionHeuristicCommitException } from '../exceptions/transaction-heuristic-commit.exception.js';
import { TransactionReadOnlyConflictException } from '../exceptions/transaction-read-only-conflict.exception.js';
import { TransactionScopeFailedException } from '../exceptions/transaction-scope-failed.exception.js';
import { TransactionTimeoutException } from '../exceptions/transaction-timeout.exception.js';
import { FederationException } from '../federation/exceptions/federation.exception.js';

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
    name: 'OptimisticLockException',
    build: () => new OptimisticLockException('SomeEntity'),
    fault: 'client',
  },
  {
    name: 'RepositoryDuplicateKeyException',
    build: () =>
      new RepositoryDuplicateKeyException([
        { key: 'k', existing: 'a', attempted: 'b' },
      ]),
    fault: 'usage',
  },
  {
    name: 'RepositoryQueryException',
    build: () => new RepositoryQueryException('SomeEntity'),
    fault: 'internal',
  },
  {
    name: 'SoftDeletedImmutableException',
    build: () => new SoftDeletedImmutableException('SomeEntity'),
    fault: 'client',
  },
  {
    name: 'TransactionClosedException',
    build: () => new TransactionClosedException(),
    fault: 'usage',
  },
  {
    name: 'TransactionHeuristicCommitException',
    build: () => new TransactionHeuristicCommitException(1, 1),
    fault: 'internal',
  },
  {
    name: 'TransactionReadOnlyConflictException',
    build: () => new TransactionReadOnlyConflictException(),
    fault: 'usage',
  },
  {
    name: 'TransactionScopeFailedException',
    build: () => new TransactionScopeFailedException(),
    fault: 'internal',
  },
  {
    name: 'TransactionTimeoutException',
    build: () => new TransactionTimeoutException(1000),
    fault: 'internal',
  },
  {
    name: 'FederationException',
    build: () => new FederationException(),
    fault: 'internal',
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
