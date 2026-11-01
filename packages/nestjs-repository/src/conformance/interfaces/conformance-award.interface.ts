import { type ConformanceAuthorInterface } from './conformance-author.interface.js';

/**
 * An award: an author's second to-many relation, beside `books`.
 *
 * `author` is a to-one relation whose foreign key is `authorId`, a reference
 * to an author.
 */
export interface ConformanceAwardInterface {
  id: string;
  name: string;
  authorId: string | null;
  author?: ConformanceAuthorInterface | null;
}
