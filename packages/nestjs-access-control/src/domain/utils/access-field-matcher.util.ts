import { type FieldMatcher } from '@casl/ability';

/**
 * Matches a rule's fields against a field path. A field covers itself and
 * everything beneath it (`address` covers `address.city`), so a deny on a
 * parent refuses its children. Fields are never patterns: rules naming
 * `*` are refused before use.
 */
export const accessFieldMatcher: FieldMatcher =
  (fields) =>
  (path): boolean =>
    fields.some((field) => path === field || path.startsWith(`${field}.`));
