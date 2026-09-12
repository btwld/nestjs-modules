import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { FederatedException } from '../domain/exceptions/federated.exception.js';
import { IdentityCreateUserException } from '../domain/exceptions/identity-create-user.exception.js';
import { IdentityFindUserException } from '../domain/exceptions/identity-find-user.exception.js';
import { IdentityUserRelationshipException } from '../domain/exceptions/identity-user-relationship.exception.js';

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
    name: 'FederatedException (default)',
    build: () => new FederatedException(),
    fault: 'internal',
  },
  {
    name: 'IdentityCreateUserException',
    build: () => new IdentityCreateUserException('SomeEntity'),
    fault: 'internal',
  },
  {
    name: 'IdentityFindUserException',
    build: () => new IdentityFindUserException('SomeEntity', { id: 'user-id' }),
    fault: 'client',
  },
  {
    name: 'IdentityUserRelationshipException',
    build: () => new IdentityUserRelationshipException('identity-id'),
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
