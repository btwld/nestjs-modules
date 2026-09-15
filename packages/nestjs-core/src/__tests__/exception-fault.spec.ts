import { fileURLToPath } from 'url';

import { type RuntimeExceptionFault } from '../domain/exceptions/exception.types.js';
import { RuntimeException } from '../domain/exceptions/runtime.exception.js';
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
    name: 'HookNotDecoratedException',
    build: () => new HookNotDecoratedException('SomeHook'),
    fault: 'usage',
  },
  {
    name: 'HookProviderNotFoundException',
    build: () => new HookProviderNotFoundException('SomeHook'),
    fault: 'usage',
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
