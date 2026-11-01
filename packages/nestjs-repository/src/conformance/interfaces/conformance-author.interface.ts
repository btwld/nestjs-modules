import { type ConformanceAwardInterface } from './conformance-award.interface.js';
import { type ConformanceBookInterface } from './conformance-book.interface.js';

/**
 * An author: the other side of `book.author` and `award.author`.
 *
 * `books` and `awards` are to-many relations matched by `book.authorId` and
 * `award.authorId`, with no foreign key of their own.
 */
export interface ConformanceAuthorInterface {
  id: string;
  name: string;
  /** The soft-remove date column. */
  removedAt: Date | null;
  books?: ConformanceBookInterface[];
  awards?: ConformanceAwardInterface[];
}
