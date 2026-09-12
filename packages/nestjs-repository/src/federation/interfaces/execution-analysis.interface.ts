import { type OrderClause } from '../../repository/repository.types.js';
import {
  type FederatedRelation,
  type FederationStrategy,
} from '../federation.types.js';
import { type FilterAnalyzer } from '../filter-analyzer.js';

/**
 * Result of analyzing execution requirements for a federation query.
 */
export interface ExecutionAnalysis {
  /** Whether to query roots first or relations first. */
  strategy: FederationStrategy;
  /** Order sort keys for the root query (relation keys removed). */
  rootOrder: OrderClause | undefined;
  /** Order sort keys keyed by relation name for peer queries. */
  relationOrders: Map<string, OrderClause>;
  /** First relation with sorts or filters (drives RELATION_FIRST iteration). */
  drivingRelation: FederatedRelation | undefined;
  /** Relation names that appear as sort keys. */
  sortedRelationNames: Set<string>;
  /** Filter analysis results. */
  filterAnalyzer: FilterAnalyzer;
}
