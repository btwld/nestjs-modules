import assert from 'node:assert/strict';

/**
 * A copy of `value` made of plain objects, so rows a driver returns as class
 * instances compare equal to plain expectations. Dates are kept. A property
 * holding `undefined` is left out: it carries nothing, as the repository
 * treats it.
 */
export function toPlain(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toPlain);
  }

  if (value === null || typeof value !== 'object' || value instanceof Date) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, toPlain(entry)]),
  );
}

/** Assert that `actual`, as plain objects, deep-equals `expected`. */
export function assertRows(actual: unknown, expected: unknown): void {
  assert.deepStrictEqual(toPlain(actual), toPlain(expected));
}

/** The values of `column` across `rows`, sorted, for order-free checks. */
export function valuesOf<Row extends object, Column extends keyof Row>(
  rows: Row[],
  column: Column,
): Row[Column][] {
  return rows.map((row) => row[column]).sort();
}

/** The values of `column` across `rows`, in the order returned. */
export function inOrder<Row extends object, Column extends keyof Row>(
  rows: Row[],
  column: Column,
): Row[Column][] {
  return rows.map((row) => row[column]);
}

/** Sort rows by `column`, for comparing relation arrays in any order. */
export function sortedBy<Row extends object>(
  rows: Row[] | undefined,
  column: keyof Row,
): Row[] | undefined {
  return rows === undefined
    ? undefined
    : [...rows].sort((a, b) =>
        String(a[column]).localeCompare(String(b[column])),
      );
}

/**
 * How a call settled: its value, or the error it failed with. For cases
 * that accept either a result or a clean failure.
 */
export async function settle<T>(
  call: Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  try {
    return { ok: true, value: await call };
  } catch (error) {
    return { ok: false, error };
  }
}

export { assert };
