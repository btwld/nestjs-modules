import { type PlainLiteralObject } from '@nestjs/common';

import {
  type DeepPartial,
  type HookResolverService,
} from '@concepta/nestjs-core';

import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import {
  type RepositoryCountOptions,
  type RepositoryFindOneOptions,
  type RepositoryFindOptions,
} from '../../repository/interfaces/repository-options.interface.js';
import {
  isWhereCompound,
  isWhereNever,
  type WhereClause,
} from '../../repository/interfaces/where-clause.interface.js';
import { RepositoryAdapter } from '../../repository/repository-adapter.js';
import {
  WhereCompoundOperator,
  WhereOperator,
} from '../../repository/repository.types.js';

export interface MemoryRepositoryOptionsFixture {
  hookResolver?: HookResolverService;
}

/**
 * A repository that keeps its rows in memory, so the abstraction's rules can
 * be tested against real reads and writes without a database.
 *
 * - Queries understand `eq`, `and`, `or` and `never`. Anything else throws, so
 *   a test cannot pass on a filter that was silently ignored.
 * - A soft-deleted row is hidden unless `withDeleted` is set.
 * - A create whose primary key is already stored throws, as a database would.
 * - A missing single-column primary key is generated as `<key>-<n>`.
 * - Rows are copied in and out, so mutating a returned entity changes nothing.
 */
export class MemoryRepositoryFixture<
  Entity extends PlainLiteralObject,
> extends RepositoryAdapter<Entity> {
  private readonly rows: Entity[] = [];
  private generated = 0;

  constructor(
    key: string,
    readonly metadata: RepositoryMetadataInterface<Entity>,
    options: MemoryRepositoryOptionsFixture = {},
  ) {
    super(key, options.hookResolver);
  }

  /** Every stored row, soft-deleted ones included, bypassing the adapter. */
  get stored(): Entity[] {
    return this.rows.map((row) => this.copy(row));
  }

  protected async doFind(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<Entity[]> {
    return this.select(options);
  }

  protected async doFindOne(
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Entity | null> {
    return this.select(options)[0] ?? null;
  }

  protected async doCount(
    options: RepositoryCountOptions = {},
  ): Promise<number> {
    return this.select(options).length;
  }

  protected async doFindAndCount(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<[Entity[], number]> {
    const found = this.select(options);
    return [found, found.length];
  }

  protected async doCreate(entity: DeepPartial<Entity>): Promise<Entity> {
    const row = this.withKey(this.toRow(entity));
    if (this.indexOf(row) !== -1) {
      throw new Error(`${this.metadata.name} primary key is already stored`);
    }
    this.rows.push(row);
    return this.copy(row);
  }

  protected async doCreateMany(
    entities: DeepPartial<Entity>[],
  ): Promise<Entity[]> {
    const created: Entity[] = [];
    for (const entity of entities) {
      created.push(await this.doCreate(entity));
    }
    return created;
  }

  protected async doUpdate(
    entity: Entity,
    data: DeepPartial<Entity>,
  ): Promise<Entity> {
    return this.write(this.require(entity), data);
  }

  protected async doReplace(
    entity: Entity,
    data: DeepPartial<Entity>,
  ): Promise<Entity> {
    return this.write(this.require(entity), data);
  }

  protected async doUpsert(entity: DeepPartial<Entity>): Promise<Entity> {
    const index = this.indexOf(this.toRow(entity));
    return index === -1 ? this.doCreate(entity) : this.write(index, entity);
  }

  protected async doDelete(entity: Entity): Promise<Entity> {
    const [removed] = this.rows.splice(this.require(entity), 1);
    return this.copy(removed ?? entity);
  }

  protected async doDeleteMany(entities: Entity[]): Promise<Entity[]> {
    const removed: Entity[] = [];
    for (const entity of entities) {
      removed.push(await this.doDelete(entity));
    }
    return removed;
  }

  protected async doSoftDelete(entity: Entity): Promise<Entity> {
    return this.markDeleted(entity, new Date());
  }

  protected async doRestore(entity: Entity): Promise<Entity> {
    return this.markDeleted(entity, null);
  }

  toRow(entityLike: DeepPartial<Entity>): Entity {
    return Object.assign(new this.metadata.type(), entityLike);
  }

  private select(options: RepositoryFindOneOptions<Entity>): Entity[] {
    const unsupported = ['select', 'join', 'order', 'skip', 'take'].filter(
      (option) => Reflect.get(options, option) !== undefined,
    );
    if (unsupported.length > 0) {
      throw new Error(
        `MemoryRepositoryFixture does not support ${unsupported.join(', ')}`,
      );
    }

    const deleteDate = this.getDeleteDateColumn();
    return this.rows
      .filter(
        (row) =>
          options.withDeleted ||
          deleteDate === undefined ||
          row[deleteDate] == null,
      )
      .filter((row) => this.matches(row, options.where))
      .map((row) => this.copy(row));
  }

  private matches(row: Entity, clause: WhereClause | undefined): boolean {
    if (clause === undefined) return true;
    if (isWhereNever(clause)) return false;
    if (isWhereCompound(clause)) {
      return clause.operator === WhereCompoundOperator.AND
        ? clause.conditions.every((condition) => this.matches(row, condition))
        : clause.conditions.some((condition) => this.matches(row, condition));
    }
    if (clause.operator === WhereOperator.EQ && clause.relation === undefined) {
      return row[clause.field] === clause.value;
    }
    throw new Error(
      `MemoryRepositoryFixture does not support the "${clause.operator}" operator`,
    );
  }

  private write(index: number, data: DeepPartial<Entity>): Entity {
    const row = Object.assign(this.copy(this.rows[index]), data);
    this.rows[index] = row;
    return this.copy(row);
  }

  private markDeleted(entity: Entity, value: Date | null): Entity {
    const column = this.getDeleteDateColumn();
    if (column === undefined) {
      throw new Error(`${this.metadata.name} has no soft-delete column`);
    }
    const index = this.require(entity);
    const row = Object.assign(this.copy(this.rows[index]), { [column]: value });
    this.rows[index] = row;
    return this.copy(row);
  }

  private withKey(row: Entity): Entity {
    const [column, ...others] = this.getPrimaryColumns();
    if (column === undefined || others.length > 0) return row;
    if (row[column] !== undefined) return row;

    this.generated += 1;
    return Object.assign(row, {
      [column]: `${this.entityKey}-${this.generated}`,
    });
  }

  private indexOf(entity: PlainLiteralObject): number {
    const columns = this.getPrimaryColumns();
    return this.rows.findIndex((row) =>
      columns.every((column) => row[column] === entity[column]),
    );
  }

  private require(entity: PlainLiteralObject): number {
    const index = this.indexOf(entity);
    if (index === -1) {
      throw new Error(`${this.metadata.name} row is not stored`);
    }
    return index;
  }

  private copy(row: Entity): Entity {
    return Object.assign(new this.metadata.type(), row);
  }
}
