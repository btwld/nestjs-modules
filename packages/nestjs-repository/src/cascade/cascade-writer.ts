import { HttpStatus, type PlainLiteralObject } from '@nestjs/common';

import { isObject } from '@concepta/nestjs-core';

import { CascadeWriteException } from '../exceptions/cascade-write.exception.js';
import { type RepositoryRelationMetadataInterface } from '../repository/interfaces/repository-relation-metadata.interface.js';
import { type RepositoryInterface } from '../repository/interfaces/repository.interface.js';
import { type RepositoryAdapter } from '../repository/repository-adapter.js';
import { Where } from '../repository/where.helpers.js';

/**
 * A relation whose rows a write passes on to the related entity's own
 * repository.
 */
export interface CascadeRelation {
  readonly relation: RepositoryRelationMetadataInterface;
  readonly target: RepositoryAdapter<PlainLiteralObject>;
}

/** The cascade relations a payload carried, by name, with their values. */
export type CascadeChildren = ReadonlyMap<string, unknown>;

/**
 * How a write treats the related rows it names: `merge` creates and updates
 * them and leaves the rest; `replace` also deletes the related rows it leaves
 * out.
 */
export type CascadeSync = 'merge' | 'replace';

/** The lifecycle operations that pass on to related rows. */
export type CascadeRemoval = 'delete' | 'softDelete' | 'restore';

/**
 * Writes an entity's cascade relations through each related entity's own
 * repository, so its hooks, row scope and checks run on every related row.
 * The related row's foreign key is always set to the parent's key.
 */
export class CascadeWriter {
  constructor(
    private readonly entityName: string,
    private readonly relations: ReadonlyMap<string, CascadeRelation>,
  ) {}

  /** `payload` without its cascade relations, and their values. */
  peel<T>(payload: T): { own: T; children: CascadeChildren } {
    const children = new Map<string, unknown>();
    if (!isObject(payload)) return { own: payload, children };

    const own = { ...payload };
    const values: PlainLiteralObject = own;
    for (const name of this.relations.keys()) {
      if (values[name] !== undefined) children.set(name, values[name]);
      delete values[name];
    }

    return { own, children };
  }

  /** Create the related rows of a new `row`, returning them by relation. */
  async create(
    row: PlainLiteralObject,
    children: CascadeChildren,
    ctx: PlainLiteralObject | undefined,
  ): Promise<PlainLiteralObject> {
    const written: PlainLiteralObject = {};

    for (const [name, { relation, target }] of this.relations) {
      if (!children.has(name)) continue;
      const rows: PlainLiteralObject[] = [];
      for (const child of this.listOf(relation, children.get(name))) {
        rows.push(
          await target.create(this.linked(relation, child, row), { ctx }),
        );
      }
      written[name] = this.shaped(relation, rows);
    }

    return written;
  }

  /**
   * Write the related rows a stored `row` names: update each one that is
   * already its related row (for a to-one relation, the one it has), create
   * the rest, and on `replace` delete its related rows the payload leaves out.
   * A to-one set to `null` deletes its row in either mode. Returns the rows
   * written, by relation.
   */
  async sync(
    row: PlainLiteralObject,
    children: CascadeChildren,
    mode: CascadeSync,
    ctx: PlainLiteralObject | undefined,
  ): Promise<PlainLiteralObject> {
    const written: PlainLiteralObject = {};

    for (const [name, { relation, target }] of this.relations) {
      if (!children.has(name)) continue;
      const list = this.listOf(relation, children.get(name));
      const existing = new Map(
        (await target.find({ where: this.childrenOf(relation, row), ctx }))
          .map((stored) => [this.keyOf(target, stored), stored] as const)
          .filter(
            (entry): entry is readonly [string, PlainLiteralObject] =>
              entry[0] !== undefined,
          ),
      );

      const toOne = relation.cardinality === 'one';
      if (toOne && existing.size > 1) {
        throw new CascadeWriteException(
          this.entityName,
          relation.name,
          `one stored row, not ${existing.size}`,
          { httpStatus: HttpStatus.CONFLICT },
        );
      }

      // A to-one payload always names the one row there is; a different key
      // is refused by that row's own repository.
      const [only] = existing.keys();
      const kept = new Set<string>();
      const rows: PlainLiteralObject[] = [];
      for (const child of list) {
        const key = toOne ? only : this.keyOf(target, child);
        const stored = key === undefined ? undefined : existing.get(key);
        const data = this.linked(relation, child, row);

        if (key !== undefined && stored) {
          kept.add(key);
          rows.push(
            mode === 'replace'
              ? await target.replace(stored, data, { ctx })
              : await target.update(stored, data, { ctx }),
          );
        } else {
          rows.push(await target.create(data, { ctx }));
        }
      }

      // Rows left out are deleted on replace; a to-one set to null always is.
      if (mode === 'replace' || (toOne && list.length === 0)) {
        for (const [key, stored] of existing) {
          if (!kept.has(key)) await target.delete(stored, { ctx });
        }
      }

      written[name] = this.shaped(relation, rows);
    }

    return written;
  }

  /**
   * Pass a delete, soft delete or restore of `row` on to its related rows,
   * before the row itself is written.
   */
  async remove(
    row: PlainLiteralObject,
    operation: CascadeRemoval,
    ctx: PlainLiteralObject | undefined,
  ): Promise<void> {
    for (const { relation, target } of this.relations.values()) {
      const where = this.childrenOf(relation, row);

      if (operation === 'softDelete') {
        for (const child of await target.find({ where, ctx })) {
          await target.softDelete(child, { ctx });
        }
        continue;
      }

      const children = await target.find({ where, withDeleted: true, ctx });

      if (operation === 'delete') {
        if (children.length > 0) await target.deleteMany(children, { ctx });
        continue;
      }

      const deleteDate = target.metadata.columns.find(
        (column) => column.isRemoveDate,
      )?.name;
      for (const child of children) {
        if (deleteDate !== undefined && child[deleteDate] != null) {
          await target.restore(child, { ctx });
        }
      }
    }
  }

  /** The related rows a payload value names, refusing anything else. */
  private listOf(
    relation: RepositoryRelationMetadataInterface,
    value: unknown,
  ): PlainLiteralObject[] {
    if (relation.cardinality === 'many') {
      if (Array.isArray(value) && value.every(isPlainRow)) return value;
      throw new CascadeWriteException(
        this.entityName,
        relation.name,
        'a list of objects',
      );
    }

    if (value === null) return [];
    if (isPlainRow(value)) return [value];
    throw new CascadeWriteException(
      this.entityName,
      relation.name,
      'an object or null',
    );
  }

  /** `child` with its foreign key set to `row`'s key. */
  private linked(
    relation: RepositoryRelationMetadataInterface,
    child: PlainLiteralObject,
    row: PlainLiteralObject,
  ): PlainLiteralObject {
    return { ...child, [relation.on.to]: row[relation.on.from] };
  }

  private childrenOf(
    relation: RepositoryRelationMetadataInterface,
    row: PlainLiteralObject,
  ) {
    return Where.eq(relation.on.to, row[relation.on.from]);
  }

  private shaped(
    relation: RepositoryRelationMetadataInterface,
    rows: PlainLiteralObject[],
  ): PlainLiteralObject[] | PlainLiteralObject | null {
    return relation.cardinality === 'many' ? rows : (rows[0] ?? null);
  }

  /** `row`'s primary key, or `undefined` when any key column is missing. */
  private keyOf(
    target: RepositoryInterface<PlainLiteralObject>,
    row: PlainLiteralObject,
  ): string | undefined {
    const values = target.metadata.columns
      .filter((column) => column.isPrimary)
      .map((column) => row[column.name]);

    return values.some((value) => value === undefined)
      ? undefined
      : JSON.stringify(values);
  }
}

function isPlainRow(value: unknown): value is PlainLiteralObject {
  return isObject(value) && !Array.isArray(value);
}
