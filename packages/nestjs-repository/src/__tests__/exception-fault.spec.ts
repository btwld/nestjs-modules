import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { ActivityBootException } from '../activity/exceptions/activity-boot.exception.js';
import { ActivityWriteException } from '../activity/exceptions/activity-write.exception.js';
import { CascadeWriteException } from '../exceptions/cascade-write.exception.js';
import { EntityAlreadyExistsException } from '../exceptions/entity-already-exists.exception.js';
import { HookBootException } from '../exceptions/hook-boot.exception.js';
import { InvalidColumnValueException } from '../exceptions/invalid-column-value.exception.js';
import { OptimisticLockException } from '../exceptions/optimistic-lock.exception.js';
import { PartialPrimaryKeyException } from '../exceptions/partial-primary-key.exception.js';
import { PrimaryKeyImmutableException } from '../exceptions/primary-key-immutable.exception.js';
import { RelationWriteException } from '../exceptions/relation-write.exception.js';
import { RepositoryBootException } from '../exceptions/repository-boot.exception.js';
import { RepositoryDatabaseException } from '../exceptions/repository-database.exception.js';
import { RepositoryDuplicateKeyException } from '../exceptions/repository-duplicate-key.exception.js';
import { RepositoryDuplicateUrnException } from '../exceptions/repository-duplicate-urn.exception.js';
import { RepositoryQueryException } from '../exceptions/repository-query.exception.js';
import { RepositoryUnboundException } from '../exceptions/repository-unbound.exception.js';
import { SoftDeletedImmutableException } from '../exceptions/soft-deleted-immutable.exception.js';
import { TransactionClosedException } from '../exceptions/transaction-closed.exception.js';
import { TransactionHeuristicCommitException } from '../exceptions/transaction-heuristic-commit.exception.js';
import { TransactionReadOnlyConflictException } from '../exceptions/transaction-read-only-conflict.exception.js';
import { TransactionScopeFailedException } from '../exceptions/transaction-scope-failed.exception.js';
import { TransactionTimeoutException } from '../exceptions/transaction-timeout.exception.js';
import { UnknownColumnException } from '../exceptions/unknown-column.exception.js';
import { FederationException } from '../federation/exceptions/federation.exception.js';
import { RowScopeBootException } from '../row-scope/exceptions/row-scope-boot.exception.js';
import { RowScopeUnboundException } from '../row-scope/exceptions/row-scope-unbound.exception.js';
import { AppendOnlyViolationException } from '../write-policy/exceptions/append-only-violation.exception.js';
import { CorrectionChainDepthException } from '../write-policy/exceptions/correction-chain-depth.exception.js';
import { WritePolicyBootException } from '../write-policy/exceptions/write-policy-boot.exception.js';

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
    name: 'RepositoryDuplicateUrnException',
    build: () =>
      new RepositoryDuplicateUrnException([
        { urn: 'urn:memory:a', existing: 'a', attempted: 'b' },
      ]),
    fault: 'usage',
  },
  {
    name: 'RepositoryQueryException',
    build: () => new RepositoryQueryException('SomeEntity'),
    fault: 'internal',
  },
  {
    name: 'RepositoryDatabaseException',
    build: () =>
      new RepositoryDatabaseException('SomeEntity', {
        database: 'testdb',
        message: 'failed',
      }),
    fault: 'internal',
  },
  {
    name: 'EntityAlreadyExistsException',
    build: () => new EntityAlreadyExistsException('SomeEntity'),
    fault: 'client',
  },
  {
    name: 'PartialPrimaryKeyException',
    build: () => new PartialPrimaryKeyException('SomeEntity', ['locale']),
    fault: 'client',
  },
  {
    name: 'PrimaryKeyImmutableException',
    build: () => new PrimaryKeyImmutableException('SomeEntity', ['id']),
    fault: 'client',
  },
  {
    name: 'RelationWriteException',
    build: () => new RelationWriteException('SomeEntity', 'children', []),
    fault: 'client',
  },
  {
    name: 'CascadeWriteException',
    build: () =>
      new CascadeWriteException('SomeEntity', 'children', 'a list of objects'),
    fault: 'client',
  },
  {
    name: 'InvalidColumnValueException',
    build: () => new InvalidColumnValueException('SomeEntity', ['name']),
    fault: 'client',
  },
  {
    name: 'UnknownColumnException',
    build: () => new UnknownColumnException('SomeEntity', ['__children__']),
    fault: 'client',
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
  {
    name: 'HookBootException',
    build: () => new HookBootException(['some failure']),
    fault: 'usage',
  },
  {
    name: 'RowScopeBootException',
    build: () => new RowScopeBootException(['some failure']),
    fault: 'usage',
  },
  {
    name: 'RowScopeUnboundException',
    build: () => new RowScopeUnboundException('orders'),
    fault: 'usage',
  },
  {
    // The caller asked for an operation the entity's declaration forbids —
    // a code error, not bad input.
    name: 'AppendOnlyViolationException',
    build: () => new AppendOnlyViolationException('SomeEntity', 'update'),
    fault: 'usage',
  },
  {
    name: 'WritePolicyBootException',
    build: () => new WritePolicyBootException(['failure']),
    fault: 'usage',
  },
  {
    name: 'ActivityBootException',
    build: () => new ActivityBootException(['failure']),
    fault: 'usage',
  },
  {
    // Without a store refusal to carry over, the record write failed on the
    // server's side.
    name: 'ActivityWriteException',
    build: () => new ActivityWriteException('SomeEntity', 'Activity'),
    fault: 'internal',
  },
  {
    name: 'RepositoryBootException',
    build: () => new RepositoryBootException(['failure']),
    fault: 'usage',
  },
  {
    name: 'RepositoryUnboundException',
    build: () => new RepositoryUnboundException('orders'),
    fault: 'usage',
  },
  {
    // Stored data is longer than the walk allows; no request caused it and
    // no retry fixes it.
    name: 'CorrectionChainDepthException',
    build: () => new CorrectionChainDepthException('some-id', 100),
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
