import {
  Membrane,
  Permeator,
  type IPermeator,
  type PassthroughPermeateCallback,
  type PermeatorOptions,
} from '@tsyche/membrane';

import { type PlainLiteralObject } from '@nestjs/common';

import {
  type DeepPartial,
  type HookMethodFilter,
  type HookMethodKeyType,
  RuntimeException,
} from '@concepta/nestjs-core';

import { RepositoryQueryException } from '../exceptions/repository-query.exception.js';
import {
  type RepositoryFindOptions,
  type RepositoryFindOneOptions,
} from '../repository/interfaces/repository-options.interface.js';

import {
  RepoHookMethodKey as K,
  RepoHookStrategy,
} from './repository-hook.decorators.js';

type RunHooksFn = <T>(
  methodKey: HookMethodKeyType,
  payload: T,
  ctx: PlainLiteralObject | undefined,
  filter?: HookMethodFilter,
) => Promise<T>;

type Ctx = PlainLiteralObject;
type HookCb = PassthroughPermeateCallback<Ctx>;

type RepoPermeator<TIn, TOut, TResult = TOut> = IPermeator<
  TIn,
  TOut,
  TIn,
  unknown,
  Ctx,
  TResult
>;

export class RepoPermeatorFactory<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> {
  // Read operations (overwrite: hooks can freely transform)
  readonly find: RepoPermeator<RepositoryFindOptions<Entity>, Entity[]>;
  readonly findOne: RepoPermeator<
    RepositoryFindOneOptions<Entity>,
    Entity,
    Entity | null
  >;
  readonly count: RepoPermeator<RepositoryFindOptions<Entity>, number>;
  readonly findAndCount: RepoPermeator<
    RepositoryFindOptions<Entity>,
    [Entity[], number]
  >;

  // Write operations (preserve: original/DB result wins)
  readonly create: RepoPermeator<DeepPartial<Entity>, Entity>;
  readonly createMany: RepoPermeator<DeepPartial<Entity>[], Entity[]>;
  readonly update: RepoPermeator<DeepPartial<Entity>, Entity>;
  readonly upsert: RepoPermeator<DeepPartial<Entity>, Entity>;
  readonly replace: RepoPermeator<DeepPartial<Entity>, Entity>;

  // Delete/lifecycle operations
  readonly delete: RepoPermeator<Entity, Entity>;
  readonly deleteMany: RepoPermeator<Entity[], Entity[]>;
  readonly softDelete: RepoPermeator<Entity, Entity>;
  readonly restore: RepoPermeator<Entity, Entity>;

  constructor(runHooks: RunHooksFn, entityName: string) {
    const cb =
      (key: HookMethodKeyType, filter?: HookMethodFilter): HookCb =>
      <T>(payload: T, ambient?: Ctx) =>
        runHooks(key, payload, ambient, filter);

    const options: PermeatorOptions<Ctx> = {
      onError: (error: unknown): never => {
        if (error instanceof RuntimeException) throw error;
        throw new RepositoryQueryException(entityName, {
          originalError: error,
        });
      },
    };

    // Read
    this.find = Permeator.mutable(
      Membrane.sequence(
        Membrane.objectReplace<
          RepositoryFindOptions<Entity>,
          RepositoryFindOptions<Entity>,
          Ctx
        >(cb(K.BEFORE_READ)),
        Membrane.objectReplace<
          RepositoryFindOptions<Entity>,
          RepositoryFindOptions<Entity>,
          Ctx
        >(cb(K.BEFORE_FIND)),
      ),
      Membrane.sequence(
        Membrane.collection<Entity, Ctx>(cb(K.AFTER_FIND), 'overwrite'),
        Membrane.collection<Entity, Ctx>(cb(K.AFTER_READ), 'overwrite'),
      ),
      options,
    );

    this.findOne = Permeator.mutable(
      Membrane.sequence(
        Membrane.objectReplace<
          RepositoryFindOneOptions<Entity>,
          RepositoryFindOneOptions<Entity>,
          Ctx
        >(cb(K.BEFORE_READ)),
        Membrane.objectReplace<
          RepositoryFindOneOptions<Entity>,
          RepositoryFindOneOptions<Entity>,
          Ctx
        >(cb(K.BEFORE_FIND_ONE)),
      ),
      Membrane.nullable(
        Membrane.sequence(
          Membrane.objectReplace<Entity, Entity, Ctx>(cb(K.AFTER_FIND_ONE)),
          Membrane.objectReplace<Entity, Entity, Ctx>(cb(K.AFTER_READ)),
        ),
      ),
      options,
    );

    this.count = Permeator.mutable(
      Membrane.sequence(
        Membrane.objectReplace<
          RepositoryFindOptions<Entity>,
          RepositoryFindOptions<Entity>,
          Ctx
        >(cb(K.BEFORE_READ)),
        Membrane.objectReplace<
          RepositoryFindOptions<Entity>,
          RepositoryFindOptions<Entity>,
          Ctx
        >(cb(K.BEFORE_COUNT)),
      ),
      Membrane.scalar<number, number, Ctx>(cb(K.AFTER_COUNT)),
      options,
    );

    this.findAndCount = Permeator.mutable(
      Membrane.sequence(
        Membrane.objectReplace<
          RepositoryFindOptions<Entity>,
          RepositoryFindOptions<Entity>,
          Ctx
        >(cb(K.BEFORE_READ)),
        Membrane.objectReplace<
          RepositoryFindOptions<Entity>,
          RepositoryFindOptions<Entity>,
          Ctx
        >(cb(K.BEFORE_FIND_AND_COUNT)),
      ),
      Membrane.objectReplace<[Entity[], number], [Entity[], number], Ctx>(
        cb(K.AFTER_FIND_AND_COUNT),
      ),
      options,
    );

    // Write: two passes per key. Default (no options, or { replace: false })
    // hooks run through Membrane.object — merge, caller wins on conflict.
    // Hooks declared { replace: true } run through Membrane.objectReplace
    // afterward — hook wins wholesale, so a caller cannot override a field
    // an authoritative hook set.
    this.create = Permeator.mutable(
      Membrane.sequence(
        Membrane.object<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_WRITE, RepoHookStrategy.merge),
        ),
        Membrane.object<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_CREATE, RepoHookStrategy.merge),
        ),
        Membrane.objectReplace<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_WRITE, RepoHookStrategy.replace),
        ),
        Membrane.objectReplace<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_CREATE, RepoHookStrategy.replace),
        ),
      ),
      Membrane.sequence(
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_CREATE)),
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_WRITE)),
      ),
      options,
    );

    this.createMany = Permeator.mutable(
      Membrane.sequence(
        Membrane.collection<DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_WRITE),
          'overwrite',
        ),
        Membrane.collection<DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_CREATE_MANY),
          'overwrite',
        ),
      ),
      Membrane.sequence(
        Membrane.collection<Entity, Ctx>(cb(K.AFTER_CREATE_MANY), 'overwrite'),
        Membrane.collection<Entity, Ctx>(cb(K.AFTER_WRITE), 'overwrite'),
      ),
      options,
    );

    this.update = Permeator.mutable(
      Membrane.sequence(
        Membrane.object<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_WRITE, RepoHookStrategy.merge),
        ),
        Membrane.object<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_UPDATE, RepoHookStrategy.merge),
        ),
        Membrane.objectReplace<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_WRITE, RepoHookStrategy.replace),
        ),
        Membrane.objectReplace<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_UPDATE, RepoHookStrategy.replace),
        ),
      ),
      Membrane.sequence(
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_UPDATE)),
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_WRITE)),
      ),
      options,
    );

    this.upsert = Permeator.mutable(
      Membrane.sequence(
        Membrane.object<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_WRITE, RepoHookStrategy.merge),
        ),
        Membrane.object<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_UPSERT, RepoHookStrategy.merge),
        ),
        Membrane.objectReplace<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_WRITE, RepoHookStrategy.replace),
        ),
        Membrane.objectReplace<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_UPSERT, RepoHookStrategy.replace),
        ),
      ),
      Membrane.sequence(
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_UPSERT)),
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_WRITE)),
      ),
      options,
    );

    this.replace = Permeator.mutable(
      Membrane.sequence(
        Membrane.object<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_WRITE, RepoHookStrategy.merge),
        ),
        Membrane.object<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_REPLACE, RepoHookStrategy.merge),
        ),
        Membrane.objectReplace<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_WRITE, RepoHookStrategy.replace),
        ),
        Membrane.objectReplace<DeepPartial<Entity>, DeepPartial<Entity>, Ctx>(
          cb(K.BEFORE_REPLACE, RepoHookStrategy.replace),
        ),
      ),
      Membrane.sequence(
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_REPLACE)),
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_WRITE)),
      ),
      options,
    );

    // Delete/lifecycle
    this.delete = Permeator.mutable(
      Membrane.sequence(
        Membrane.object<Entity, Entity, Ctx>(cb(K.BEFORE_DESTROY)),
        Membrane.object<Entity, Entity, Ctx>(cb(K.BEFORE_DELETE)),
      ),
      Membrane.sequence(
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_DELETE)),
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_DESTROY)),
      ),
      options,
    );

    this.deleteMany = Permeator.mutable(
      Membrane.sequence(
        Membrane.collection<Entity, Ctx>(cb(K.BEFORE_DESTROY), 'preserve'),
        Membrane.collection<Entity, Ctx>(cb(K.BEFORE_DELETE_MANY), 'preserve'),
      ),
      Membrane.sequence(
        Membrane.collection<Entity, Ctx>(cb(K.AFTER_DELETE_MANY), 'preserve'),
        Membrane.collection<Entity, Ctx>(cb(K.AFTER_DESTROY), 'preserve'),
      ),
      options,
    );

    this.softDelete = Permeator.mutable(
      Membrane.sequence(
        Membrane.object<Entity, Entity, Ctx>(cb(K.BEFORE_TRANSITION)),
        Membrane.object<Entity, Entity, Ctx>(cb(K.BEFORE_SOFT_DELETE)),
      ),
      Membrane.sequence(
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_SOFT_DELETE)),
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_TRANSITION)),
      ),
      options,
    );

    this.restore = Permeator.mutable(
      Membrane.sequence(
        Membrane.object<Entity, Entity, Ctx>(cb(K.BEFORE_TRANSITION)),
        Membrane.object<Entity, Entity, Ctx>(cb(K.BEFORE_RESTORE)),
      ),
      Membrane.sequence(
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_RESTORE)),
        Membrane.object<Entity, Entity, Ctx>(cb(K.AFTER_TRANSITION)),
      ),
      options,
    );
  }
}
