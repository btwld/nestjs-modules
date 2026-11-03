/**
 * Whether a driver provides an optional capability. `'refused'` runs the
 * capability's refusal cases, if it has any, instead of its positive ones.
 */
export type ConformanceCapability = 'supported' | 'refused';

/**
 * The optional capabilities a driver declares. Everything else the suite
 * covers is required.
 */
export interface ConformanceCapabilitiesInterface {
  /**
   * The driver registers a transaction factory, and every read and write
   * made with a run's `ctx` takes part in the transaction
   * `TransactionScope.run()` opens for it.
   */
  transactions: ConformanceCapability;

  /**
   * The driver reports the relations an entity declares, and translates
   * reads that join them, filter on them and sort by them. A driver that
   * refuses it reports no relations, so the repository refuses every such
   * read.
   */
  relations: ConformanceCapability;

  /**
   * The driver loads relations an entity declares eager when the entity is
   * registered with `allowEagerRelations`. Needs `relations`.
   */
  eagerResults: ConformanceCapability;

  /**
   * The store enforces `book.authorId` as a reference to an author: it
   * refuses a book naming no author, and the delete of an author a book
   * still names.
   */
  referentialIntegrity: ConformanceCapability;

  /**
   * The driver supports soft delete: it reports the remove date an entity
   * declares, sets and clears it, and leaves soft-deleted rows out of reads.
   * A driver that refuses it must refuse at startup an entity that declares
   * a remove date; its harness binds every fixture to an entity whose
   * `removedAt` is an ordinary column.
   */
  softDelete: ConformanceCapability;
}
