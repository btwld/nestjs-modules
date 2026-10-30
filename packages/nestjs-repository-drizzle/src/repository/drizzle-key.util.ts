/**
 * Column values as one string, for matching rows by key. A `bigint` is kept
 * apart from a string holding the same digits.
 */
export function keyOf(values: unknown[]): string {
  return JSON.stringify(values, (_key, value: unknown) =>
    typeof value === 'bigint' ? { bigint: value.toString() } : value,
  );
}
