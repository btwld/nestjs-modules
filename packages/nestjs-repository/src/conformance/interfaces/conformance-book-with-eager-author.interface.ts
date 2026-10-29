import { type ConformanceAuthorInterface } from './conformance-author.interface.js';

/**
 * A book whose `author` the entity declares eager, registered with
 * `allowEagerRelations`. A driver that supports eager results returns each
 * row's author without a join; one that refuses them returns none. Its rows
 * are its own, not `book`'s.
 */
export interface ConformanceBookWithEagerAuthorInterface {
  id: string;
  title: string;
  authorId: string | null;
  /** The soft-remove date column. */
  removedAt: Date | null;
  author?: ConformanceAuthorInterface | null;
}
