import { type HookOption } from '@concepta/nestjs-core';

import { type FederationOrchestrator } from '../../federation/federation-orchestrator.service.js';
import { type RowScopeRegistration } from '../../row-scope/interfaces/row-scope-registration.interface.js';
import { type WritePolicyRegistration } from '../../write-policy/interfaces/write-policy-registration.interface.js';

/**
 * What `RepositoryModule.forRoot()` binds to a repository, from its entry.
 *
 * Bound once, before the repository serves any call. The row scope resolver
 * instance is attached separately, after binding.
 */
export interface RepositoryBindingInterface {
  /** Whether the entity's rows are scoped, and by which resolver class. */
  readonly rowScope?: RowScopeRegistration;

  /** Hooks registered for the entity. */
  readonly hooks?: HookOption[];

  /** Whether stored rows may change. */
  readonly writePolicy?: WritePolicyRegistration;

  /** Accept results holding declared relations nobody joined. */
  readonly allowEagerRelations?: boolean;

  /**
   * The relations whose rows, or whose junction rows, have a row scope. A
   * read cannot join them: a join would bypass that row scope.
   */
  readonly relationsIntoScoped?: readonly string[];

  /** Runs `findAndCount` calls that join federated relations. */
  readonly federationOrchestrator?: FederationOrchestrator;
}
