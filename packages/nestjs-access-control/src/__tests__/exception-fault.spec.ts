import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { AccessControlException } from '../domain/exceptions/access-control.exception.js';
import { AccessRefusedException } from '../domain/exceptions/access-refused.exception.js';
import { AccessRulesInvalidException } from '../domain/exceptions/access-rules-invalid.exception.js';

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
    name: 'AccessControlException',
    build: () => new AccessControlException(),
    fault: 'internal',
  },
  {
    name: 'AccessRefusedException',
    build: () =>
      new AccessRefusedException({
        action: 'read:any',
        subject: 'user',
        reason: 'no-grant',
      }),
    fault: 'client',
  },
  {
    name: 'AccessRulesInvalidException',
    build: () => new AccessRulesInvalidException(['problem']),
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

  it.each<[string, RuntimeException]>([
    ['ACCESS_CONTROL_ERROR', new AccessControlException()],
    [
      'ACCESS_REFUSED_ERROR',
      new AccessRefusedException({
        action: 'read:any',
        subject: 'user',
        reason: 'denied',
      }),
    ],
    [
      'ACCESS_RULES_INVALID_ERROR',
      new AccessRulesInvalidException(['problem']),
    ],
  ])('sets error code %s', (errorCode, exception) => {
    expect(exception.errorCode).toEqual(errorCode);
  });

  it('refuses with 403', () => {
    expect(
      new AccessRefusedException({
        action: 'read:any',
        subject: 'user',
        reason: 'denied',
      }).getStatus(),
    ).toEqual(403);
  });
});
