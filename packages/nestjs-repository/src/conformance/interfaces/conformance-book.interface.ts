import { type ConformanceAuthorInterface } from './conformance-author.interface.js';
import { type ConformanceTagInterface } from './conformance-tag.interface.js';

/**
 * A book.
 *
 * `author` is a to-one relation whose foreign key is `authorId`, a reference
 * to an author; whether the store enforces it is the `referentialIntegrity`
 * capability. `tags` is one side of a many-to-many relation.
 * Where the driver lets an entity declare a relation eager, declare `author`
 * eager: `book` is registered without `allowEagerRelations`, so a read must
 * still leave it out.
 */
export interface ConformanceBookInterface {
  id: string;
  title: string;
  authorId: string | null;
  /** The soft-remove date column, or an ordinary one where soft delete is refused. */
  removedAt: Date | null;
  author?: ConformanceAuthorInterface | null;
  tags?: ConformanceTagInterface[];
}
