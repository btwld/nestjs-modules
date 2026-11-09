/**
 * Interface for controller entity and name configuration.
 *
 * Used by controller options and CQRS handler factories.
 */
export interface CrudControllerEntityInterface {
  /**
   * Entity key used for repository/adapter injection tokens.
   */
  entity: string;

  /**
   * Name used for CQRS class naming and operationIds.
   * Falls back to entity if not provided.
   */
  name?: string;
}
