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

  /**
   * Require every registered entity to carry a write policy declaration.
   *
   * Opt-in for the same reason as `requireRowScopeDeclaration`: whether an
   * undeclared entity is an omission depends on the deployment. Turning it on
   * makes "nobody decided whether this entity's rows may change" a startup
   * failure instead of a default.
   */
  requireWritePolicyDeclaration?: boolean;
}
