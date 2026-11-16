import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryRelationMetadataInterface } from '../repository/interfaces/repository-relation-metadata.interface.js';
import { type RepositoryAdapter } from '../repository/repository-adapter.js';

/**
 * A relation whose rows a write passes on to the related entity's own
 * repository.
 */
export interface CascadeRelation {
  readonly relation: RepositoryRelationMetadataInterface;
  readonly target: RepositoryAdapter<PlainLiteralObject>;
}
