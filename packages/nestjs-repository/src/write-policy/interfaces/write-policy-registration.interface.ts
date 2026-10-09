/**
 * An entity whose rows may never be changed once written.
 *
 * `create` and `createMany` stay open; every operation that targets a stored
 * row — update, replace, upsert, delete, deleteMany, soft-delete, restore — is
 * refused.
 * Correcting such a record means appending a new one that references it.
 *
 * `reason` is required for the same purpose row scope requires one on a
 * `public` declaration: making a row immutable is a decision someone has to
 * defend later, so it has to be written down rather than defaulted into.
 * Nothing reads it.
 */
export interface WritePolicyAppendOnlyRegistration {
  readonly access: 'append-only';
  readonly reason: string;
}

/**
 * An entity whose rows may be changed in place. The default; declaring it is
 * only useful as an explicit statement alongside append-only siblings.
 */
export interface WritePolicyMutableRegistration {
  readonly access: 'mutable';
}

/**
 * A write policy declaration, written inline in the `forFeature()` entities
 * array.
 *
 * Discriminated on an explicit `access` tag rather than on shape, so adding a
 * field to either variant cannot silently change which one a declaration is.
 */
export type WritePolicyRegistration =
  WritePolicyAppendOnlyRegistration | WritePolicyMutableRegistration;

/**
 * Narrow a declaration to the append-only variant.
 */
export function isAppendOnly(
  registration: WritePolicyRegistration | undefined,
): registration is WritePolicyAppendOnlyRegistration {
  return registration?.access === 'append-only';
}
