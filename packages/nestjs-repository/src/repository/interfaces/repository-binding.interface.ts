import { type PlainLiteralObject } from '@nestjs/common';

import { type HookOption } from '@concepta/nestjs-core';

import { type CascadeRelation } from '../../cascade/cascade-writer.js';
import {
  type FederatedRelation,
  type FederationReader,
} from '../../federation/federation-reader.service.js';
import { type RowScopeRegistration } from '../../row-scope/interfaces/row-scope-registration.interface.js';
import { type WritePolicyRegistration } from '../../write-policy/interfaces/write-policy-registration.interface.js';
import { type RepositoryAdapter } from '../repository-adapter.js';

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
   * The relations whose rows, or whose junction rows, have a row scope, each
   * with the repository of its rows when those are the scoped ones. A read
   * cannot join them, since a join would bypass that row scope, unless they
   * are federated or the join stays inside a resolver both entities share;
   * and the entity cannot allow eager relations.
   */
  readonly relationsIntoScoped?: ReadonlyMap<
    string,
    RepositoryAdapter<PlainLiteralObject> | undefined
  >;

  /** The entity's federated relations, and how they are read. */
  readonly federation?: RepositoryFederationBinding;

  /**
   * The relations whose rows are written with the entity, through their own
   * repositories, by name.
   */
  readonly cascade?: ReadonlyMap<string, CascadeRelation>;
}

/**
 * The relations an entity reads through their own repositories instead of a
 * join, by name.
 */
export interface RepositoryFederationBinding {
  readonly reader: FederationReader;
  readonly relations: ReadonlyMap<string, FederatedRelation>;
  /** The most keys any one federated query may carry. */
  readonly maxKeys: number;
}
