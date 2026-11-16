import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryAdapter } from '../../repository/repository-adapter.js';

/**
 * Where an entity's activity records go, and what they carry, as its
 * `forRoot()` entry declares it.
 */
export interface ActivityBinding {
  /** The store's own repository. */
  readonly store: RepositoryAdapter<PlainLiteralObject>;

  /** The recorded entity's primary key column. */
  readonly primaryColumn: string;

  readonly values: boolean;

  readonly omit: ReadonlySet<string>;
}
