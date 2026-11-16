/**
 * An entity with a unique column besides its key, for writes that collide
 * with another row. `id` is the caller's.
 */
export interface ConformanceUniqueItemInterface {
  id: string;
  /** Unique across every row. */
  code: string;
  name: string;
  /** The optimistic-locking version column. */
  version: number;
}
