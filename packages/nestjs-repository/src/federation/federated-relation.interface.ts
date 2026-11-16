import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryRelationMetadataInterface } from '../repository/interfaces/repository-relation-metadata.interface.js';
import { type WhereCondition } from '../repository/interfaces/where-clause.interface.js';

/** A federated relation an entity joins, with its `forRoot()` settings. */
export interface FederatedRelation {
  readonly relation: RepositoryRelationMetadataInterface;
  /** Narrows which related rows belong to the relation. */
  readonly distinctFilter?: WhereCondition<PlainLiteralObject>;
}
