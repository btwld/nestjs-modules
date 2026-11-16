import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { TypeOrmEntityNameException } from '../exceptions/typeorm-entity-name.exception.js';
import { TypeOrmQueryCacheException } from '../exceptions/typeorm-query-cache.exception.js';
import { TypeOrmRelationMetadataException } from '../exceptions/typeorm-relation-metadata.exception.js';
import { TypeOrmUnsupportedDatabaseException } from '../exceptions/typeorm-unsupported-database.exception.js';

/**
 * Anti-drift check: every `RuntimeException` subclass in this package states
 * an expected `fault` here.
 */
const CASES: {
  name: string;
  build: () => RuntimeException;
  fault: RuntimeExceptionFault;
  errorCode: string;
}[] = [
  {
    name: 'TypeOrmEntityNameException',
    errorCode: 'TYPEORM_ENTITY_NAME_RESOLUTION',
    build: () => new TypeOrmEntityNameException(),
    fault: 'usage',
  },
  {
    name: 'TypeOrmQueryCacheException',
    errorCode: 'TYPEORM_QUERY_CACHE',
    build: () => new TypeOrmQueryCacheException('Post'),
    fault: 'usage',
  },
  {
    name: 'TypeOrmRelationMetadataException',
    errorCode: 'TYPEORM_RELATION_METADATA',
    build: () => new TypeOrmRelationMetadataException('posts', 'PostEntity'),
    fault: 'usage',
  },
  {
    name: 'TypeOrmUnsupportedDatabaseException',
    errorCode: 'TYPEORM_UNSUPPORTED_DATABASE',
    build: () =>
      new TypeOrmUnsupportedDatabaseException('Post', 'mongodb', 'postgres'),
    fault: 'usage',
  },
];

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

describe('exception fault classification', () => {
  it.each(CASES)('$name has fault=$fault', ({ build, fault }) => {
    expect(build().fault).toEqual(fault);
  });

  it.each(CASES)('$name has errorCode=$errorCode', ({ build, errorCode }) => {
    expect(build().errorCode).toEqual(errorCode);
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
