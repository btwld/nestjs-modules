import { type ConformanceAuthorInterface } from './conformance-author.interface.js';

/**
 * An award: an author's second to-many relation, beside `books`.
 *
 * `author` is a to-one relation by `authorId`.
 */
export interface ConformanceAwardInterface {
  id: string;
  name: string;
  authorId: string | null;
  author?: ConformanceAuthorInterface | null;
}
