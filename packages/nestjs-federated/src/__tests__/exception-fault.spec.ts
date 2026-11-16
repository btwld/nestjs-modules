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
  errorCode: string;
}[] = [
  {
    name: 'FederatedException (default)',
    errorCode: 'FEDERATED_ERROR',
    build: () => new FederatedException(),
    fault: 'internal',
  },
  {
    name: 'IdentityCreateUserException',
    errorCode: 'FEDERATED_IDENTITY_CREATE_USER_ERROR',
    build: () => new IdentityCreateUserException('SomeEntity'),
    fault: 'internal',
  },
  {
    name: 'IdentityFindUserException',
    errorCode: 'FEDERATED_IDENTITY_FIND_USER_ERROR',
    build: () => new IdentityFindUserException('SomeEntity', { id: 'user-id' }),
    fault: 'client',
  },
  {
    name: 'IdentityUserRelationshipException',
    errorCode: 'FEDERATED_IDENTITY_USER_RELATIONSHIP_ERROR',
    build: () => new IdentityUserRelationshipException('identity-id'),
    fault: 'internal',
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
