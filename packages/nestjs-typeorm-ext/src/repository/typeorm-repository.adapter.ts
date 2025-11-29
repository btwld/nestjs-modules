import {
  FindManyOptions,
  FindOneOptions,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { PlainLiteralObject } from '@nestjs/common';

import {
  DeepPartial,
  RepositoryInternals,
  RepositoryInterface,
  ModelQueryException,
} from '@concepta/nestjs-common';

/**
 * Abstract service
 */
export class TypeOrmRepositoryAdapter<Entity extends PlainLiteralObject>
  implements RepositoryInterface<Entity>
{
  /**
   * Constructor
   *
   * @param repo - instance of the repo
   */
  constructor(public readonly repo: Repository<Entity>) {}

  /**
   * Find wrapper.
   *
   * @param options - Find many optionsq
   */
  async find(
    options?: RepositoryInternals.FindManyOptions<Entity>,
  ): Promise<Entity[]> {
    try {
      // type assertion
      const cleanOptions: FindManyOptions | undefined = options;
      // call the repo find
      return this.repo.find(cleanOptions);
    } catch (e) {
      // fatal orm error
      throw new ModelQueryException(this.entityName(), {
        originalError: e,
      });
    }
  }

  /**
   * Find One wrapper.
   *
   * @param options - Find one options
   */
  async findOne(
    options: RepositoryInternals.FindOneOptions<Entity>,
  ): Promise<Entity | null> {
    try {
      // call the repo find one
      return this.repo.findOne(options as FindOneOptions<Entity>);
    } catch (e) {
      // fatal orm error
      // TODO: remove metadata?
      throw new ModelQueryException(this.entityName(), {
        originalError: e,
      });
    }
  }

  /**
   * Get the entity name from the repository metadata.
   */
  entityName(): string {
    return this.repo.metadata?.name || this.repo.metadata?.targetName;
  }

  async count(
    options?: RepositoryInternals.FindManyOptions<Entity>,
  ): Promise<number> {
    return this.repo.count(options as FindManyOptions<Entity>);
  }

  create(entityLike: DeepPartial<Entity> | never): Entity {
    return this.repo.create(entityLike as Entity);
  }

  async save<T extends DeepPartial<Entity>>(
    entities: T[],
    options?: RepositoryInternals.SaveOptions,
  ): Promise<(T & Entity)[]>;
  async save<T extends DeepPartial<Entity>>(
    entity: T,
    options?: RepositoryInternals.SaveOptions,
  ): Promise<T & Entity>;
  async save<T extends DeepPartial<Entity>>(
    entities: T | T[],
    options?: RepositoryInternals.SaveOptions,
  ): Promise<(T & Entity) | (T & Entity)[]> {
    if (Array.isArray(entities)) {
      return this.repo.save(entities, options);
    } else {
      return this.repo.save(entities, options);
    }
  }

  async remove(entities: Entity[]): Promise<Entity[]>;
  async remove(entity: Entity): Promise<Entity>;
  async remove(entity: Entity | Entity[]): Promise<Entity | Entity[]> {
    if (Array.isArray(entity)) {
      return this.repo.remove(entity);
    } else {
      return this.repo.remove(entity);
    }
  }

  /**
   * Soft remove entities (sets delete date)
   */
  async softRemove(entities: Entity[]): Promise<Entity[]>;
  async softRemove(entity: Entity): Promise<Entity>;
  async softRemove(entity: Entity | Entity[]): Promise<Entity | Entity[]> {
    if (Array.isArray(entity)) {
      return this.repo.softRemove(entity as DeepPartial<Entity>[]);
    } else {
      return this.repo.softRemove(entity as DeepPartial<Entity>);
    }
  }

  /**
   * Recover soft-deleted entities
   */
  async recover(entities: Entity[]): Promise<Entity[]>;
  async recover(entity: Entity): Promise<Entity>;
  async recover(entity: Entity | Entity[]): Promise<Entity | Entity[]> {
    if (Array.isArray(entity)) {
      return this.repo.recover(entity as DeepPartial<Entity>[]);
    } else {
      return this.repo.recover(entity as DeepPartial<Entity>);
    }
  }

  merge(
    mergeIntoEntity: Entity,
    ...entityLikes: DeepPartial<Entity>[]
  ): Entity {
    return this.repo.merge(mergeIntoEntity, ...entityLikes);
  }

  gt<T>(value: T) {
    return MoreThan<T>(value);
  }

  gte<T>(value: T) {
    return MoreThanOrEqual<T>(value);
  }

  lt<T>(value: T) {
    return LessThan<T>(value);
  }

  lte<T>(value: T) {
    return LessThanOrEqual<T>(value);
  }
}
