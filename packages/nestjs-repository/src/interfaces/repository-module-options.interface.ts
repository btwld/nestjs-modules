/**
 * Core module options for RepositoryModule
 */
export interface RepositoryModuleOptionsInterface {
  /**
   * Default transaction timeout in milliseconds.
   */
  defaultTimeout?: number;

  /**
   * Fail startup if any registered entity has no row scope declaration.
   *
   * Off by default, so adding row scope does not break deployments that
   * already register entities. Turning it on is what makes "nobody remembered
   * to declare this entity" a startup failure instead of a silent omission.
   */
  requireRowScopeDeclaration?: boolean;
}
