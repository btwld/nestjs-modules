import { PlainLiteralObject } from '@nestjs/common';

import { QueryFilter } from '../request/types/crud-request-query.types';

export function safeRequire<T = unknown>(
  path: string,
  loader?: () => T,
): T | null {
  try {
    /* istanbul ignore next */
    const pack = loader ? loader() : require(path);
    return pack;
  } catch (_) {
    /* istanbul ignore next */
    return null;
  }
}

export function queryFilterIsArray<T extends PlainLiteralObject>(
  cond: QueryFilter<T>,
): boolean {
  return Array.isArray(cond.value) && cond.value.length > 0;
}
