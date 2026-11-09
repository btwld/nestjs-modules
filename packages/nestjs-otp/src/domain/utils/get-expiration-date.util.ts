import { toMilliseconds } from '@concepta/nestjs-core';

import { OtpInvalidExpirationDateException } from '../exceptions/otp-invalid-expiration-date.exception.js';

export const getExpirationDate = (
  expiresIn: string,
  now: Date = new Date(),
): Date => {
  // expiresIn is a required, client-supplied schema field with no
  // module-configured fallback — an unparseable value is the caller's
  // mistake.
  const expires = toMilliseconds(expiresIn, undefined, 'client');

  if (!expires) {
    throw new OtpInvalidExpirationDateException();
  }

  return new Date(now.getTime() + expires);
};
