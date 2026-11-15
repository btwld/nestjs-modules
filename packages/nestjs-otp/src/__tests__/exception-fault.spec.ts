import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { OtpNotFoundException } from '../application/exceptions/otp-not-found.exception.js';
import { OtpInvalidExpirationDateException } from '../domain/exceptions/otp-invalid-expiration-date.exception.js';
import { OtpLimitReachedException } from '../domain/exceptions/otp-limit-reached.exception.js';
import { OtpTypeNotDefinedException } from '../domain/exceptions/otp-type-not-defined.exception.js';
import { OtpValidationException } from '../domain/exceptions/otp-validation.exception.js';
import { OtpException } from '../domain/exceptions/otp.exception.js';
import { OtpEntityNotFoundException } from '../infrastructure/exceptions/otp-entity-not-found.exception.js';

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
    name: 'OtpException (default)',
    errorCode: 'OTP_ERROR',
    build: () => new OtpException(),
    fault: 'internal',
  },
  {
    name: 'OtpInvalidExpirationDateException',
    errorCode: 'OTP_INVALID_EXPIRES_IN',
    build: () => new OtpInvalidExpirationDateException(),
    fault: 'client',
  },
  {
    name: 'OtpLimitReachedException',
    errorCode: 'OTP_LIMIT_REACHED_ERROR',
    build: () => new OtpLimitReachedException(),
    fault: 'client',
  },
  {
    name: 'OtpTypeNotDefinedException',
    errorCode: 'OTP_TYPE_NOT_DEFINED_ERROR',
    build: () => new OtpTypeNotDefinedException('someType'),
    fault: 'usage',
  },
  {
    name: 'OtpValidationException',
    errorCode: 'OTP_VALIDATION_ERROR',
    build: () => new OtpValidationException('someSchema', []),
    fault: 'client',
  },
  {
    name: 'OtpNotFoundException',
    errorCode: 'OTP_NOT_FOUND_ERROR',
    build: () => new OtpNotFoundException({ id: 'id' }),
    fault: 'client',
  },
  {
    name: 'OtpEntityNotFoundException',
    errorCode: 'OTP_ENTITY_NOT_FOUND_ERROR',
    build: () => new OtpEntityNotFoundException('SomeEntity'),
    fault: 'usage',
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
