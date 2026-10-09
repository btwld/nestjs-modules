import { fileURLToPath } from 'url';

import { type RuntimeExceptionFault } from '../domain/exceptions/exception.types.js';
import { RuntimeException } from '../domain/exceptions/runtime.exception.js';
import { CurrencyConfigurationException } from '../domain/value-objects/money/exceptions/currency-configuration.exception.js';
import { CurrencyMismatchException } from '../domain/value-objects/money/exceptions/currency-mismatch.exception.js';
import { CurrencyUnknownException } from '../domain/value-objects/money/exceptions/currency-unknown.exception.js';
import { MoneyColumnTypeException } from '../domain/value-objects/money/exceptions/money-column-type.exception.js';
import { MoneyInvalidAmountException } from '../domain/value-objects/money/exceptions/money-invalid-amount.exception.js';
import { OverlayAlreadyDefinedException } from '../infrastructure/context/exceptions/overlay-already-defined.exception.js';
import { OverlayImmutableException } from '../infrastructure/context/exceptions/overlay-immutable.exception.js';
import { OverlayNotDefinedException } from '../infrastructure/context/exceptions/overlay-not-defined.exception.js';
import { HookNotDecoratedException } from '../infrastructure/hook/exceptions/hook-not-decorated.exception.js';
import { HookProviderNotFoundException } from '../infrastructure/hook/exceptions/hook-provider-not-found.exception.js';
import { collectRuntimeExceptionClassNames } from '../testing/collect-runtime-exception-class-names.js';

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

/**
 * Anti-drift check: every `RuntimeException` subclass in this package states
 * an expected `fault` here. A new exception class added without a row (or
 * without updating an inherited default here) is a signal the classification
 * sweep was skipped, not a signal to widen the table casually.
 */
const CASES: {
  name: string;
  build: () => RuntimeException;
  fault: RuntimeExceptionFault;
}[] = [
  {
    name: 'RuntimeException (default)',
    build: () => new RuntimeException(),
    fault: 'internal',
  },
  {
    name: 'OverlayNotDefinedException',
    build: () => new OverlayNotDefinedException('SomeOverlay'),
    fault: 'usage',
  },
  {
    name: 'OverlayImmutableException',
    build: () => new OverlayImmutableException('SomeOverlay'),
    fault: 'usage',
  },
  {
    name: 'OverlayAlreadyDefinedException',
    build: () => new OverlayAlreadyDefinedException('SomeOverlay'),
    fault: 'usage',
  },
  {
    name: 'HookNotDecoratedException',
    build: () => new HookNotDecoratedException('SomeHook'),
    fault: 'usage',
  },
  {
    name: 'HookProviderNotFoundException',
    build: () => new HookProviderNotFoundException('SomeHook'),
    fault: 'usage',
  },
  {
    // A bad currency code is data-shaped — it most plausibly arrives in a
    // request body, so it is the caller's to fix.
    name: 'CurrencyUnknownException',
    build: () => new CurrencyUnknownException('ZZZ'),
    fault: 'client',
  },
  {
    // Configuring currencies twice, late, or with a bad table is a startup
    // mistake in the application, not something a request caused.
    name: 'CurrencyConfigurationException',
    build: () => new CurrencyConfigurationException('test'),
    fault: 'usage',
  },
  {
    // Adding USD to EUR is never valid input; it is a logic error in the
    // code doing the adding.
    name: 'CurrencyMismatchException',
    build: () => new CurrencyMismatchException('add', 'USD', 'EUR'),
    fault: 'usage',
  },
  {
    name: 'MoneyInvalidAmountException',
    build: () => new MoneyInvalidAmountException(1.5, 'test'),
    fault: 'usage',
  },
  {
    // No request caused this and no retry fixes it: the column is declared
    // with a type that has already discarded precision.
    name: 'MoneyColumnTypeException',
    build: () => new MoneyColumnTypeException(1.5),
    fault: 'internal',
  },
];

describe('exception fault classification', () => {
  it.each(CASES)('$name has fault=$fault', ({ build, fault }) => {
    expect(build().fault).toEqual(fault);
  });

  it('every RuntimeException subclass in this package is listed above', async () => {
    const discovered = await collectRuntimeExceptionClassNames(
      SRC_DIR,
      RuntimeException,
    );
    const expected = new Set(CASES.map((c) => c.build().constructor.name));
    const missing = discovered.filter((name) => !expected.has(name));
    expect(missing).toEqual([]);
  });
});
