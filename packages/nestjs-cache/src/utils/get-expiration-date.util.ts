import { toMilliseconds } from '@concepta/nestjs-common';

import { CacheInvalidExpiredDateException } from '../exceptions/cache-invalid-expired-date.exception';

const getExpirationDate = (
  expiresIn: string | null | undefined,
): Date | null => {
  if (!expiresIn) return null;

  const now = new Date();
  const expires = toMilliseconds(expiresIn);

  // TODO: should be a custom exception
  if (!expires) throw new CacheInvalidExpiredDateException();

  // add time in seconds to now as string format
  return new Date(now.getTime() + expires);
};

export default getExpirationDate;
