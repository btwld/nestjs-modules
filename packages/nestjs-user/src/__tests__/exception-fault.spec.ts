import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { UserNotFoundException } from '../application/exceptions/user-not-found.exception.js';
import { UserCredentialsAlreadyExistException } from '../domain/exceptions/user-credentials-already-exist.exception.js';
import { UserPasswordCurrentInvalidException } from '../domain/exceptions/user-password-current-invalid.exception.js';
import { UserPasswordHistoryViolationException } from '../domain/exceptions/user-password-history-violation.exception.js';
import { UserException } from '../domain/exceptions/user.exception.js';

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
    name: 'UserException (default)',
    build: () => new UserException(),
    fault: 'internal',
  },
  {
    name: 'UserNotFoundException',
    build: () => new UserNotFoundException({ id: 'id' }),
    fault: 'client',
  },
  {
    name: 'UserCredentialsAlreadyExistException',
    build: () => new UserCredentialsAlreadyExistException(),
    fault: 'client',
  },
  {
    name: 'UserPasswordCurrentInvalidException',
    build: () => new UserPasswordCurrentInvalidException(),
    fault: 'client',
  },
  {
    name: 'UserPasswordHistoryViolationException',
    build: () => new UserPasswordHistoryViolationException(),
    fault: 'client',
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
