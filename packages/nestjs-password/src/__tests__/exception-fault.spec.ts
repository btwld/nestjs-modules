import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { PasswordCurrentRequiredException } from '../domain/exceptions/password-current-required.exception.js';
import { PasswordNotStrongException } from '../domain/exceptions/password-not-strong.exception.js';
import { PasswordRequiredException } from '../domain/exceptions/password-required.exception.js';
import { PasswordUsedRecentlyException } from '../domain/exceptions/password-used-recently.exception.js';
import { PasswordException } from '../domain/exceptions/password.exception.js';

/**
 * Anti-drift check: every `RuntimeException` subclass in this package states
 * an expected `fault` here.
 */
const CASES: {
  name: string;
  build: () => RuntimeException;
  fault: RuntimeExceptionFault;
  errorCode: string;
}[] = [
  {
    name: 'PasswordException (default)',
    errorCode: 'PASSWORD_ERROR',
    build: () => new PasswordException(),
    fault: 'internal',
  },
  {
    name: 'PasswordCurrentRequiredException',
    errorCode: 'PASSWORD_CURRENT_REQUIRED_ERROR',
    build: () => new PasswordCurrentRequiredException(),
    fault: 'client',
  },
  {
    name: 'PasswordNotStrongException',
    errorCode: 'PASSWORD_NOT_STRONG_ERROR',
    build: () => new PasswordNotStrongException(),
    fault: 'client',
  },
  {
    name: 'PasswordRequiredException',
    errorCode: 'PASSWORD_REQUIRED_ERROR',
    build: () => new PasswordRequiredException(),
    fault: 'client',
  },
  {
    name: 'PasswordUsedRecentlyException',
    errorCode: 'PASSWORD_USED_RECENTLY_ERROR',
    build: () => new PasswordUsedRecentlyException(),
    fault: 'client',
  },
];

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

describe('exception fault classification', () => {
  it.each(CASES)('$name has fault=$fault', ({ build, fault }) => {
    expect(build().fault).toEqual(fault);
  });

  it.each(CASES)('$name has errorCode=$errorCode', ({ build, errorCode }) => {
    expect(build().errorCode).toEqual(errorCode);
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
