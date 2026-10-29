import { type ConformanceAuthorInterface } from './conformance-author.interface.js';
import { type ConformanceBookInterface } from './conformance-book.interface.js';
import { type ConformanceTagInterface } from './conformance-tag.interface.js';

/**
 * The authors, books and tags the relation cases seed, by name.
 */
export interface ConformanceLibraryInterface {
  authors: {
    ann: ConformanceAuthorInterface;
    bob: ConformanceAuthorInterface;
    cat: ConformanceAuthorInterface;
  };
  books: {
    alpha: ConformanceBookInterface;
    beta: ConformanceBookInterface;
    gamma: ConformanceBookInterface;
    delta: ConformanceBookInterface;
  };
  tags: {
    news: ConformanceTagInterface;
    tech: ConformanceTagInterface;
  };
}
