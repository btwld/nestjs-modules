import * as nestShared from '@nestjs/common/utils/shared.utils';

import {
  isNil,
  isNumber,
  isObject,
  isString,
  isUndefined,
} from '../type-guards.util.js';

const SAMPLE_VALUES: unknown[] = [
  undefined,
  null,
  0,
  1,
  -1,
  NaN,
  Infinity,
  '',
  'a',
  {},
  { a: 1 },
  [],
  [1, 2],
  true,
  false,
  () => undefined,
  Symbol('s'),
  new Date(),
  /re/,
];

// These local copies exist only to avoid an undocumented deep import into
// `@nestjs/common/utils/shared.utils`. This spec pins their behavior against
// that same Nest internal so any future drift between the two fails loudly
// here instead of silently in consumers.
describe('type-guards.util drift against @nestjs/common/utils/shared.utils', () => {
  it.each(SAMPLE_VALUES)('isUndefined matches for %s', (val) => {
    expect(isUndefined(val)).toBe(nestShared.isUndefined(val));
  });

  it.each(SAMPLE_VALUES)('isNil matches for %s', (val) => {
    expect(isNil(val)).toBe(nestShared.isNil(val));
  });

  it.each(SAMPLE_VALUES)('isObject matches for %s', (val) => {
    expect(isObject(val)).toBe(nestShared.isObject(val));
  });

  it.each(SAMPLE_VALUES)('isString matches for %s', (val) => {
    expect(isString(val)).toBe(nestShared.isString(val));
  });

  it.each(SAMPLE_VALUES)('isNumber matches for %s', (val) => {
    expect(isNumber(val)).toBe(nestShared.isNumber(val));
  });
});
