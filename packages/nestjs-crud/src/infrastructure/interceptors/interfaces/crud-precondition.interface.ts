/**
 * A parsed `If-Match` precondition. Presence means the client sent the
 * header at all; `version` is undefined for `If-Match: *`, which asserts
 * only that the resource exists.
 */
export interface CrudPreconditionInterface {
  version?: number;
}
