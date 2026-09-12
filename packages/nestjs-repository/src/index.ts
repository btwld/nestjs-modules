// ═══════════════════════════════════════════════════════════════════
// Module
// ═══════════════════════════════════════════════════════════════════
export { RepositoryModule } from './repository.module.js';

// ═══════════════════════════════════════════════════════════════════
// Repository Adapter
// ═══════════════════════════════════════════════════════════════════
export { RepositoryAdapter } from './repository/repository-adapter.js';

// ═══════════════════════════════════════════════════════════════════
// Repository Implementation Interfaces
// ═══════════════════════════════════════════════════════════════════
export {
  RelationActionConfig,
  RepositoryProviderOptions,
} from './interfaces/repository-provider-options.interface.js';
export {
  RepositoryModuleInterface,
  DynamicRepositoryModule,
} from './interfaces/repository-module.interface.js';

// ═══════════════════════════════════════════════════════════════════
// Exceptions
// ═══════════════════════════════════════════════════════════════════
export { RepositoryDuplicateKeyException } from './exceptions/repository-duplicate-key.exception.js';
export { RepositoryQueryException } from './exceptions/repository-query.exception.js';
export { OptimisticLockException } from './exceptions/optimistic-lock.exception.js';
export { FederationException } from './federation/exceptions/federation.exception.js';
export { TransactionTimeoutException } from './exceptions/transaction-timeout.exception.js';
export { TransactionClosedException } from './exceptions/transaction-closed.exception.js';
export { TransactionHeuristicCommitException } from './exceptions/transaction-heuristic-commit.exception.js';
export { TransactionReadOnlyConflictException } from './exceptions/transaction-read-only-conflict.exception.js';
export { TransactionScopeFailedException } from './exceptions/transaction-scope-failed.exception.js';

// ═══════════════════════════════════════════════════════════════════
// Transaction
// ═══════════════════════════════════════════════════════════════════
export { TransactionFactoryInterface } from './interfaces/transaction-factory.interface.js';
export { TransactionManager } from './transaction/transaction-manager.js';
export { TransactionScope } from './transaction/transaction-scope.js';
export { RepoCtx } from './context/interfaces/repository-context.interface.js';
export { TrxCtx } from './transaction/interfaces/transaction-context.interface.js';
export { TransactionalRunner } from './transaction/transactional-runner.js';
export {
  getTransactionalOptions,
  isTransactional,
  Transactional,
  TransactionalOptions,
} from './transaction/transactional.decorator.js';
export { TransactionInterceptor } from './interceptors/transaction.interceptor.js';

// ═══════════════════════════════════════════════════════════════════
// Permeators
// ═══════════════════════════════════════════════════════════════════
export { RepoPermeatorFactory } from './hooks/repo-permeator-factory.js';

// ═══════════════════════════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════════════════════════

// Hook method types
export {
  // Read operations
  BeforeFindMethod,
  AfterFindMethod,
  BeforeFindOneMethod,
  AfterFindOneMethod,
  BeforeCountMethod,
  AfterCountMethod,
  BeforeFindAndCountMethod,
  AfterFindAndCountMethod,
  // Create operations
  BeforeCreateMethod,
  AfterCreateMethod,
  BeforeCreateManyMethod,
  AfterCreateManyMethod,
  // Update operations
  BeforeUpdateMethod,
  AfterUpdateMethod,
  BeforeUpsertMethod,
  AfterUpsertMethod,
  BeforeReplaceMethod,
  AfterReplaceMethod,
  // Delete operations
  BeforeDeleteMethod,
  AfterDeleteMethod,
  BeforeDeleteManyMethod,
  AfterDeleteManyMethod,
  // Lifecycle operations
  BeforeSoftDeleteMethod,
  AfterSoftDeleteMethod,
  BeforeRestoreMethod,
  AfterRestoreMethod,
  // High-level semantic operations
  BeforeReadMethod,
  AfterReadMethod,
  BeforeWriteMethod,
  AfterWriteMethod,
  BeforeTransitionMethod,
  AfterTransitionMethod,
  BeforeDestroyMethod,
  AfterDestroyMethod,
} from './hooks/hook-method.types.js';

// Hook decorators
export {
  // Repository hook method keys
  RepoHookMethodKey,
  // Repository hook type decorator
  RepoHook,
  // Write hook opt-in replace semantics
  RepoWriteHookOptions,
  RepoHookStrategy,
  // High-level semantic decorators
  BeforeRead,
  AfterRead,
  BeforeWrite,
  AfterWrite,
  BeforeTransition,
  AfterTransition,
  BeforeDestroy,
  AfterDestroy,
  // Fine-grained query decorators
  BeforeFind,
  AfterFind,
  BeforeFindOne,
  AfterFindOne,
  BeforeCount,
  AfterCount,
  BeforeFindAndCount,
  AfterFindAndCount,
  // Fine-grained create decorators
  BeforeCreate,
  AfterCreate,
  BeforeCreateMany,
  AfterCreateMany,
  // Fine-grained update decorators
  BeforeUpdate,
  AfterUpdate,
  BeforeUpsert,
  AfterUpsert,
  BeforeReplace,
  AfterReplace,
  // Fine-grained delete decorators
  BeforeDelete,
  AfterDelete,
  BeforeDeleteMany,
  AfterDeleteMany,
  // Fine-grained lifecycle decorators
  BeforeSoftDelete,
  AfterSoftDelete,
  BeforeRestore,
  AfterRestore,
} from './hooks/repository-hook.decorators.js';

// Hook specifications
export { RepoSpec } from './hooks/specifications/repo-spec.factory.js';
export { EntitySpecification } from './hooks/specifications/entity.specification.js';

// Repository interfaces
export { RepositoryInterface } from './repository/interfaces/repository.interface.js';
export { RepositoryEntityOptionInterface } from './repository/interfaces/repository-entity-option.interface.js';
export { RepositoryColumnMetadataInterface } from './repository/interfaces/repository-column-metadata.interface.js';
export { RepositoryMetadataInterface } from './repository/interfaces/repository-metadata.interface.js';
export { RepositoryRelationMetadataInterface } from './repository/interfaces/repository-relation-metadata.interface.js';

// Repository option types
export {
  RepositoryFindOneOptions,
  RepositoryFindOptions,
  RepositoryCreateOptions,
  RepositoryUpdateOptions,
  RepositoryUpsertOptions,
  RepositoryDeleteOptions,
  RepositoryRestoreOptions,
} from './repository/interfaces/repository-options.interface.js';

// Repository query types
export {
  EntityColumn,
  WhereOperator,
  WhereNullaryOperator,
  WhereScalarOperator,
  WhereArrayOperator,
  WherePairOperator,
  WhereCompoundOperator,
  WhereConditionArr,
  RelationAction,
  SortOrder,
  OrderSortKey,
  OrderSortKeyArr,
  OrderClause,
} from './repository/repository.types.js';

// Order sort key interfaces
export {
  OrderSortKeyAsc,
  OrderSortKeyDesc,
} from './repository/interfaces/order-sort-key.interface.js';

// Join clause interface
export { JoinClause } from './repository/interfaces/join-clause.interface.js';

// Where clause interfaces
export {
  WhereConditionNullary,
  WhereConditionScalar,
  WhereConditionArray,
  WhereConditionPair,
  WhereCondition,
  WhereCompound,
  WhereClause,
  isWhereCondition,
  isWhereCompound,
  isNullaryCondition,
  isArrayCondition,
  isPairCondition,
} from './repository/interfaces/where-clause.interface.js';

// Where clause helpers
export { Where } from './repository/where.helpers.js';

// Order clause helpers
export { OrderBy } from './repository/order-by.helpers.js';

// Join clause helpers
export { Join } from './repository/join.helpers.js';

// Repository utils
export { getDynamicRepositoryToken } from './utils/get-dynamic-repository-token.js';

// Repository decorators
export { InjectDynamicRepository } from './decorators/inject-dynamic-repository.decorator.js';

// Transaction interfaces
export { TransactionInterface } from './transaction/interfaces/transaction.interface.js';

// Context interfaces
export { TransactionContextInterface } from './transaction/interfaces/transaction-context.interface.js';
