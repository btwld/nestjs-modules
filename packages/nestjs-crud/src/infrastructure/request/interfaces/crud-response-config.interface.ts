import { type CrudSchema } from '../../../crud.types.js';
import { type CrudSerializationOptionsInterface } from '../../interfaces/crud-serialization-options.interface.js';

/**
 * Response configuration for CRUD operations.
 *
 * Used at controller level to set defaults, and at route level for overrides.
 */
export interface CrudResponseConfig {
  /**
   * Schema for single resource responses.
   */
  resource?: CrudSchema;

  /**
   * Schema for collection responses (future use when de-paginate is supported).
   */
  collection?: CrudSchema;

  /**
   * Schema for paginated responses.
   */
  paginated?: CrudSchema;

  /**
   * Serialization options for response transformation.
   */
  serialization?: CrudSerializationOptionsInterface;

  /**
   * Return the deleted entity in delete/soft delete responses.
   */
  returnDeleted?: boolean;

  /**
   * Return the restored entity in restore responses.
   */
  returnRestored?: boolean;
}
