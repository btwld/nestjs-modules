import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { InvitationNotFoundException } from '../application/exceptions/invitation-not-found.exception.js';
import { InvitationUserUndefinedException } from '../application/exceptions/invitation-user-undefined.exception.js';
import { InvitationAlreadyAcceptedException } from '../domain/exceptions/invitation-already-accepted.exception.js';
import { InvitationRevokedException } from '../domain/exceptions/invitation-revoked.exception.js';
import { InvitationException } from '../domain/exceptions/invitation.exception.js';
import { InvitationNotAcceptedException } from '../gateways/exceptions/invitation-not-accepted.exception.js';

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
    name: 'InvitationException (default)',
    build: () => new InvitationException(),
    fault: 'internal',
  },
  {
    name: 'InvitationAlreadyAcceptedException',
    build: () => new InvitationAlreadyAcceptedException(),
    fault: 'client',
  },
  {
    name: 'InvitationRevokedException',
    build: () => new InvitationRevokedException(),
    fault: 'client',
  },
  {
    name: 'InvitationNotFoundException',
    build: () => new InvitationNotFoundException('id'),
    fault: 'client',
  },
  {
    name: 'InvitationUserUndefinedException',
    build: () => new InvitationUserUndefinedException(),
    fault: 'usage',
  },
  {
    name: 'InvitationNotAcceptedException',
    build: () => new InvitationNotAcceptedException(),
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
