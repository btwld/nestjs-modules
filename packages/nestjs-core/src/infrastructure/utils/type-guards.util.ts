export const isUndefined = (val: unknown): val is undefined =>
  typeof val === 'undefined';

export const isNil = (val: unknown): val is null | undefined =>
  isUndefined(val) || val === null;

export const isObject = (val: unknown): val is object =>
  !isNil(val) && typeof val === 'object';

export const isString = (val: unknown): val is string =>
  typeof val === 'string';

export const isNumber = (val: unknown): val is number =>
  typeof val === 'number';
