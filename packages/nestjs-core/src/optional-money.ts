/**
 * `@concepta/nestjs-core/optional/money`
 *
 * Exact monetary arithmetic. Requires the optional peer dependency
 * `decimal.js`; nothing on the package's other entry points imports it, so a
 * consumer that does no money work never installs it.
 */

export { Money } from './domain/value-objects/money/money.js';
export {
  Rounding,
  RoundingMode,
} from './domain/value-objects/money/rounding.js';
export {
  configureCurrencies,
  ConfigureCurrenciesOptions,
  CurrencyTable,
  isKnownCurrency,
  minorUnitsOf,
  assertKnownCurrency,
} from './domain/value-objects/money/currency.js';

export { MoneyInterface } from './domain/value-objects/money/interfaces/money.interface.js';

export {
  moneySchema,
  moneyAmountSchema,
  currencyCodeSchema,
} from './domain/value-objects/money/money.schema.js';

export {
  moneyAmountTransformer,
  ColumnTransformerInterface,
} from './domain/value-objects/money/money-amount.transformer.js';

export { CurrencyConfigurationException } from './domain/value-objects/money/exceptions/currency-configuration.exception.js';
export { CurrencyMismatchException } from './domain/value-objects/money/exceptions/currency-mismatch.exception.js';
export { CurrencyUnknownException } from './domain/value-objects/money/exceptions/currency-unknown.exception.js';
export { MoneyInvalidAmountException } from './domain/value-objects/money/exceptions/money-invalid-amount.exception.js';
export { MoneyColumnTypeException } from './domain/value-objects/money/exceptions/money-column-type.exception.js';
