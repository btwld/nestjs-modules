import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryRelationMetadataInterface } from '../repository/interfaces/repository-relation-metadata.interface.js';

/**
 * Relation metadata enriched with a single computed field.
 *
 * `isOwning` is derived from comparing `on.from` against the
 * root entity's primary keys and is used throughout federation
 * to determine constraint direction and hydration logic.
 */
export type FederatedRelation =
  Readonly<RepositoryRelationMetadataInterface> & {
    /**
     * True when root entity holds the FK (owning side).
     *
     * Owning: `on.from` is root FK, `on.to` is target PK.
     * Non-owning: `on.from` is root PK, `on.to` is target FK.
     *
     * Owning relations cannot drive RELATION_FIRST strategy
     * because root IDs cannot be extracted from target data.
     */
    isOwning: boolean;
    /** Copied from the JoinClause at build time. */
    joinType: 'LEFT' | 'INNER';
  };

/** Execution strategy type. */
export enum FederationStrategy {
  ROOT_FIRST = 'ROOT_FIRST',
  RELATION_FIRST = 'RELATION_FIRST',
}

/** Relation query result. */
export interface RelationResult {
  relation: FederatedRelation;
  data: PlainLiteralObject[];
  total: number;
}
