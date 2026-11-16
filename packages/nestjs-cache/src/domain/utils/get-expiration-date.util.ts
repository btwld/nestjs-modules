import {
  toMilliseconds,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';

import { CacheInvalidExpiredDateException } from '../exceptions/cache-invalid-expired-date.exception.js';

/**
 * @param expiresIn - the value to parse; caller decides whether this is a
 *   client-supplied value or a module-configured default via `fault`
 * @param fault - `'client'` if `expiresIn` came from the caller's request,
 *   `'usage'` if it's a module-configured default that turned out invalid
 */
const getExpirationDate = (
  expiresIn: string | null | undefined,
  fault: RuntimeExceptionFault = 'client',
): Date | null => {
  if (!expiresIn) return null;

  const now = new Date();
  const expires = toMilliseconds(expiresIn, undefined, fault);

  if (!expires) throw new CacheInvalidExpiredDateException({ fault });

  // add expiration duration (in ms) to current time
  return new Date(now.getTime() + expires);
};

export { getExpirationDate };
