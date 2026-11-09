/**
 * The plain, serializable shape of a monetary amount.
 *
 * `amount` is a decimal **string**, not a number: a JSON number cannot
 * represent `0.1` exactly and a large one loses digits outright, so the wire
 * and storage format carries the exact decimal as text.
 *
 * This is the type `moneySchema` validates and `Money.toJSON()` produces. It is
 * deliberately separate from the `Money` class — a zod schema needs an
 * inferable object shape, and persistence needs a shape with no behaviour
 * attached.
 */
export interface MoneyInterface {
  /** Exact decimal, e.g. `'1234.56'`. */
  amount: string;
  /** ISO 4217 code, e.g. `'USD'`. */
  currency: string;
}
