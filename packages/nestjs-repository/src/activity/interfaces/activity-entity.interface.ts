/**
 * The recorded entity, as the activity writer needs it.
 */
export interface ActivityEntity {
  /** The entity's `forRoot()` key. */
  readonly key: string;

  readonly name: string;

  /** The entity's storage identity, as its driver reports it. */
  readonly urn: string;

  /** The entity's own columns. */
  readonly columns: readonly string[];

  readonly deleteDateColumn?: string;
}
