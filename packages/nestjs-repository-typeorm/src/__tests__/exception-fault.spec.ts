import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { TypeOrmEntityNameException } from '../exceptions/typeorm-entity-name.exception.js';
import { TypeOrmRelationMetadataException } from '../exceptions/typeorm-relation-metadata.exception.js';
import { TypeOrmTransactionSettingsUnsupportedException } from '../exceptions/typeorm-transaction-settings-unsupported.exception.js';
import { TypeOrmUnsupportedDatabaseException } from '../exceptions/typeorm-unsupported-database.exception.js';

/**
 * Anti-drift check: every `RuntimeException` subclass in this package states
 * an expected `fault` here.
 */
const CASES: {
  name: string;
  build: () => RuntimeException;
  fault: RuntimeExceptionFault;
}[] = [
  {
    name: 'TypeOrmEntityNameException',
    build: () => new TypeOrmEntityNameException(),
    fault: 'usage',
  },
  {
    name: 'TypeOrmRelationMetadataException',
    build: () => new TypeOrmRelationMetadataException('posts', 'PostEntity'),
    fault: 'usage',
  },
  {
    name: 'TypeOrmTransactionSettingsUnsupportedException',
    build: () =>
      new TypeOrmTransactionSettingsUnsupportedException('default', 'mysql'),
    fault: 'usage',
  },
  {
    name: 'TypeOrmUnsupportedDatabaseException',
    build: () => new TypeOrmUnsupportedDatabaseException('Post', 'mongodb'),
    fault: 'usage',
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
