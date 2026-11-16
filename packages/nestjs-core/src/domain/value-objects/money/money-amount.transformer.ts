import { MoneyColumnTypeException } from './exceptions/money-column-type.exception.js';

/**
 * The shape a persistence layer's column transformer has to satisfy.
 *
 * Declared here rather than imported, so this package stays free of any ORM
 * dependency. TypeORM's own `ValueTransformer` is structural — an object with
 * `to` and `from` — so {@link moneyAmountTransformer} satisfies it without
 * either side importing the other.
 */
export interface ColumnTransformerInterface<Model, Column> {
  /** Model value → column value, on the way to the database. */
  to(value: Model): Column;
  /** Column value → model value, on the way back. */
  from(value: Column): Model;
}

/**
 * Transformer for the **amount** column of a money pair.
 *
 * A column transformer only ever sees one column, so this handles the decimal
 * string; the currency lives in its own column and the two are assembled into
 * a `Money` by the entity's mapper.
 *
 * **Its real job is refusing a number.** Drivers disagree about what a decimal
 * column hands back:
 *
 * - `node-postgres` returns `numeric` as a **string**, deliberately, because
 *   the value does not fit a JS `number` without loss.
 * - SQLite has no decimal type. A column declared `decimal`/`numeric` gets
 *   NUMERIC affinity, and better-sqlite3 returns it as a **number** — already
 *   rounded, before any application code runs.
 *
 * So money columns must be `numeric` on Postgres and `text` on SQLite. A
 * `number` arriving here means the column was declared with the wrong type,
 * and the precision is already gone — which is why this throws rather than
 * coercing. A schema-time check could not catch it: the column may be
 * redefined by a later migration, and the value would then be silently wrong
 * at runtime.
 */
export const moneyAmountTransformer: ColumnTransformerInterface<
  string | null,
  unknown
> = {
  to(value: string | null): string | null {
    return value ?? null;
  },

  from(value: unknown): string | null {
    if (value === null || value === undefined) return null;

    if (typeof value === 'string') return value;

    if (typeof value === 'number') {
      throw new MoneyColumnTypeException(value);
    }

    // decimal.js, BigNumber, Postgres `bigint` as bigint — anything that
    // renders itself exactly is acceptable.
    if (typeof value === 'bigint') return value.toString();

    // `toFixed()` with no argument, not `String()`: decimal.js and BigNumber
    // render `toString()` in exponential notation at the edges of their
    // range, which `Money.of` would then refuse.
    if (
      typeof value === 'object' &&
      'toFixed' in value &&
      typeof value.toFixed === 'function'
    ) {
      const rendered: unknown = value.toFixed();
      if (typeof rendered === 'string') return rendered;
    }

    throw new MoneyColumnTypeException(value);
  },
};
