import { type ConformanceBookInterface } from './conformance-book.interface.js';

/**
 * A tag: one side of a many-to-many relation with books. The junction
 * between them is the driver's own.
 */
export interface ConformanceTagInterface {
  id: string;
  label: string;
  books?: ConformanceBookInterface[];
}
