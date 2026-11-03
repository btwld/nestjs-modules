import { type PlainLiteralObject } from '@nestjs/common';

/** A row as the database returned it. */
function isRow(value: unknown): value is PlainLiteralObject {
  return typeof value === 'object' && value !== null;
}

/** Rows as the database returned them. */
export function toRows(values: unknown): PlainLiteralObject[] {
  return Array.isArray(values) ? values.filter(isRow) : [];
}

/**
 * A value as Drizzle read it, as one string, for telling whether a write
 * changed it. A `bigint` is kept apart from a string holding the same
 * digits, and `NaN` and the infinities from `null`.
 */
export function asStored(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, each: unknown) => {
    if (typeof each === 'bigint') return { bigint: each.toString() };
    if (typeof each === 'number' && !Number.isFinite(each)) {
      return { number: String(each) };
    }
    return each;
  });
}
