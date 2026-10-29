import { type ConformanceBookInterface } from './conformance-book.interface.js';

/**
 * An author: the other side of `book.author`.
 *
 * `books` is a to-many relation matched by `book.authorId`, with no foreign
 * key of its own.
 */
export interface ConformanceAuthorInterface {
  id: string;
  name: string;
  /** The soft-remove date column. */
  removedAt: Date | null;
  books?: ConformanceBookInterface[];
}
