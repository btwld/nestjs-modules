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
   * The driver loads relations an entity declares eager when the entity is
   * registered with `allowEagerRelations`.
   */
  eagerResults: ConformanceCapability;

  /**
   * The store enforces `book.authorId` as a reference to an author: it
   * refuses a book naming no author, and the delete of an author a book
   * still names.
   */
  referentialIntegrity: ConformanceCapability;

  /**
   * The driver reports a remove date its entity declares, and soft deletes,
   * restores and leaves out soft-deleted rows by it. A driver that refuses
   * it must refuse at startup an entity that declares one, and binds every
   * fixture to an entity whose `removedAt` is an ordinary column.
   */
  softDelete: ConformanceCapability;
}
