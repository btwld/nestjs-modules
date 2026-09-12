import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { CrudContextException } from '../infrastructure/exceptions/crud-context.exception.js';
import { CrudDecoratorException } from '../infrastructure/exceptions/crud-decorator.exception.js';
import { CrudQueryException } from '../infrastructure/exceptions/crud-query.exception.js';
import { CrudException } from '../infrastructure/exceptions/crud.exception.js';
import { CrudQueryParserException } from '../infrastructure/request/exceptions/crud-query-parser.exception.js';
import { CrudQueryValidatorException } from '../infrastructure/request/exceptions/crud-query-validator.exception.js';

/**
 * Anti-drift check: every `RuntimeException` subclass in this package states
 * an expected `fault` here. Does not cover call-site `fault` overrides on
 * the generic `CrudException` (e.g. the decorator-time sanity checks) —
 * those are functional/behavioral, not class-level, classifications.
 */
const CASES: {
  name: string;
  build: () => RuntimeException;
  fault: RuntimeExceptionFault;
}[] = [
  {
    name: 'CrudException (default)',
    build: () => new CrudException(),
    fault: 'internal',
  },
  {
    name: 'CrudContextException',
    build: () => new CrudContextException(),
    fault: 'internal',
  },
  {
    name: 'CrudDecoratorException',
    build: () => new CrudDecoratorException(),
    fault: 'usage',
  },
  {
    name: 'CrudQueryException',
    build: () => new CrudQueryException('SomeEntity'),
    fault: 'internal',
  },
  {
    name: 'CrudQueryParserException',
    build: () => new CrudQueryParserException(),
    fault: 'client',
  },
  {
    name: 'CrudQueryValidatorException',
    build: () => new CrudQueryValidatorException(),
    fault: 'client',
  },
];

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

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
