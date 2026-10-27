import {
  HttpStatus,
  Inject,
  Injectable,
  PlainLiteralObject,
} from '@nestjs/common';

import { type RepositoryRelationMetadataInterface } from '../repository/interfaces/repository-relation-metadata.interface.js';
import { type RepositoryInterface } from '../repository/interfaces/repository.interface.js';
import {
  type WhereClause,
  type WhereCondition,
} from '../repository/interfaces/where-clause.interface.js';
import { Where } from '../repository/where.helpers.js';
import {
  REPOSITORY_REGISTRY,
  RepositoryRegistryService,
} from '../services/repository-registry.service.js';

import { FederationException } from './exceptions/federation.exception.js';
import { type FederatedWhere } from './federated-where.js';

export const FEDERATION_READER = Symbol('FederationReader');

/** `federation.maxKeys` when `forRoot()` does not set it. */
export const FEDERATION_DEFAULT_MAX_KEYS = 1000;

/** A federated relation an entity joins, with its `forRoot()` settings. */
export interface FederatedRelation {
  readonly relation: RepositoryRelationMetadataInterface;
  /** Narrows which related rows belong to the relation. */
  readonly distinctFilter?: WhereCondition<PlainLiteralObject>;
}

/** What a federated read needs from the root's own store. */
export interface FederationRoot {
  /**
   * The root rows matching `where`, holding at least `columns`, at most
   * `take` of them. Runs under the read's own row scope and soft delete.
   */
  rows(
    columns: string[],
    where: WhereClause | undefined,
    take: number,
  ): Promise<PlainLiteralObject[]>;
}

/** How a federated read reaches the related repositories. */
export interface FederationReadOptions {
  /**
   * The `ctx` each related read runs under. Called before every read, so it
   * can refuse a `ctx` a hook changed during an earlier one.
   */
  readonly ctx: () => PlainLiteralObject | undefined;
  readonly withDeleted?: boolean;
  /** The most keys any one query may carry, or any one key set may hold. */
  readonly maxKeys: number;
}

/**
 * Reads federated relations through their own repositories, so each related
 * read runs that repository's hooks, row scope and checks under the caller's
 * `ctx`.
 *
 * A filter on a federated relation becomes a condition on the root's own
 * column, `on.from IN (keys)`, so the root's store pages, sorts and counts the
 * whole read itself. No query carries more than `maxKeys` keys: a filter whose
 * keys exceed that on both sides is refused, never truncated.
 */
@Injectable()
export class FederationReader {
  constructor(
    @Inject(REPOSITORY_REGISTRY)
    private readonly registry: RepositoryRegistryService,
  ) {}

  /**
   * The where clause the root's store runs, with each federated filter
   * replaced by a condition on the root's own column.
   */
  async rootWhere(
    root: FederationRoot,
    where: FederatedWhere,
    relations: ReadonlyMap<string, FederatedRelation>,
    options: FederationReadOptions,
  ): Promise<WhereClause | undefined> {
    const filters = [...where.relations].map(([name, filter]) => ({
      federated: this.relation(relations, name),
      filter,
    }));
    if (filters.length === 0) return where.root;

    const { maxKeys } = options;
    const constraints: WhereClause[] = [];
    let pending = filters;

    // The root side first: when few roots match their own conditions, each
    // relation only has to be asked about those.
    let candidates = await root.rows(
      columnsOf(filters),
      where.root,
      maxKeys + 1,
    );

    if (candidates.length > maxKeys) {
      // Otherwise each relation is asked which roots it matches.
      pending = [];
      for (const entry of filters) {
        const keys = await this.relatedKeys(entry, options);
        if (keys) {
          constraints.push(inKeys(entry.federated.relation.on.from, keys));
        } else {
          pending.push(entry);
        }
      }

      if (pending.length === filters.length) throw tooBroad(filters, maxKeys);
      if (pending.length > 0) {
        candidates = await root.rows(
          columnsOf(pending),
          combine(where.root, constraints),
          maxKeys + 1,
        );
        if (candidates.length > maxKeys) throw tooBroad(pending, maxKeys);
      }
    }

    for (const entry of pending) {
      const { from } = entry.federated.relation.on;
      const keys = await this.matchingKeys(
        entry,
        distinct(candidates.map((row) => row[from])),
        options,
      );
      constraints.push(inKeys(from, keys));
    }

    return combine(where.root, constraints);
  }

  /**
   * Attach each federated relation to `rows`: a to-one holds its related row
   * or `null`, a to-many its related rows or `[]`. A relation the read also
   * filters on holds only the related rows that matched, as a join would.
   */
  async hydrate(
    rows: PlainLiteralObject[],
    relations: readonly FederatedRelation[],
    where: FederatedWhere,
    options: FederationReadOptions,
  ): Promise<void> {
    for (const federated of relations) {
      const { relation } = federated;
      const keys = distinct(rows.map((row) => row[relation.on.from]));
      assertWithinLimit(relation, keys.length, options.maxKeys);

      const related = keys.length
        ? await this.relatedRows(
            federated,
            keys,
            where.relations.get(relation.name),
            options,
          )
        : new Map<unknown, PlainLiteralObject[]>();

      for (const row of rows) {
        const matched = related.get(row[relation.on.from]) ?? [];
        const values: PlainLiteralObject = row;
        if (relation.cardinality === 'many') {
          values[relation.name] = matched;
          continue;
        }
        if (matched.length > 1) {
          throw new FederationException({
            message:
              'Relation "%s" is to-one, but %d %s rows point at the same row',
            messageParams: [
              relation.name,
              matched.length,
              relation.targetEntity,
            ],
          });
        }
        values[relation.name] = matched[0] ?? null;
      }
    }
  }

  /**
   * The related rows for `keys`, grouped by the root key they belong to.
   */
  private async relatedRows(
    { relation, distinctFilter }: FederatedRelation,
    keys: unknown[],
    filter: WhereClause | undefined,
    options: FederationReadOptions,
  ): Promise<Map<unknown, PlainLiteralObject[]>> {
    const target = this.target(relation);
    const narrowing = [filter, distinctFilter].filter(isDefined);

    if (!relation.through) {
      const rows = await target.find({
        where: combine(Where.in(relation.on.to, keys), narrowing),
        withDeleted: options.withDeleted,
        ctx: options.ctx(),
      });
      return groupBy(rows, (row) => row[relation.on.to]);
    }

    const { fromKey, toKey } = relation.through;
    const links = await this.junction(relation).find({
      select: [fromKey, toKey],
      where: Where.in(fromKey, keys),
      withDeleted: options.withDeleted,
      ctx: options.ctx(),
    });
    const targetKeys = distinct(links.map((link) => link[toKey]));
    assertLinksWithinLimit(relation, targetKeys.length, options.maxKeys);

    const targets = targetKeys.length
      ? await target.find({
          where: combine(Where.in(relation.on.to, targetKeys), narrowing),
          withDeleted: options.withDeleted,
          ctx: options.ctx(),
        })
      : [];
    const byKey = groupBy(targets, (row) => row[relation.on.to]);

    // One entry per junction row, as a join through it would return.
    const grouped = new Map<unknown, PlainLiteralObject[]>();
    for (const link of links) {
      grouped.set(link[fromKey], [
        ...(grouped.get(link[fromKey]) ?? []),
        ...(byKey.get(link[toKey]) ?? []),
      ]);
    }
    return grouped;
  }

  /**
   * The root keys (`on.from` values) whose related rows match `filter`, or
   * `undefined` when more than `maxKeys` related rows match.
   */
  private async relatedKeys(
    {
      federated,
      filter,
    }: { federated: FederatedRelation; filter: WhereClause },
    options: FederationReadOptions,
  ): Promise<unknown[] | undefined> {
    const { relation, distinctFilter } = federated;
    const { maxKeys } = options;
    const target = this.target(relation);

    const matched = await target.find({
      select: [relation.on.to],
      where: combine(filter, [distinctFilter].filter(isDefined)),
      take: maxKeys + 1,
      withDeleted: options.withDeleted,
      ctx: options.ctx(),
    });
    if (matched.length > maxKeys) return undefined;

    const targetKeys = distinct(matched.map((row) => row[relation.on.to]));
    if (!relation.through) return targetKeys;
    if (targetKeys.length === 0) return [];

    const { fromKey, toKey } = relation.through;
    const links = await this.junction(relation).find({
      select: [fromKey],
      where: Where.in(toKey, targetKeys),
      take: maxKeys + 1,
      withDeleted: options.withDeleted,
      ctx: options.ctx(),
    });
    if (links.length > maxKeys) return undefined;

    return distinct(links.map((link) => link[fromKey]));
  }

  /**
   * Which of `keys` (`on.from` values of candidate roots) have related rows
   * matching `filter`.
   */
  private async matchingKeys(
    {
      federated,
      filter,
    }: { federated: FederatedRelation; filter: WhereClause },
    keys: unknown[],
    options: FederationReadOptions,
  ): Promise<unknown[]> {
    if (keys.length === 0) return [];

    const { relation, distinctFilter } = federated;
    const narrowing = [filter, distinctFilter].filter(isDefined);
    const target = this.target(relation);

    if (!relation.through) {
      const matched = await target.find({
        select: [relation.on.to],
        where: combine(Where.in(relation.on.to, keys), narrowing),
        withDeleted: options.withDeleted,
        ctx: options.ctx(),
      });
      return distinct(matched.map((row) => row[relation.on.to]));
    }

    const { fromKey, toKey } = relation.through;
    const links = await this.junction(relation).find({
      select: [fromKey, toKey],
      where: Where.in(fromKey, keys),
      withDeleted: options.withDeleted,
      ctx: options.ctx(),
    });
    const targetKeys = distinct(links.map((link) => link[toKey]));
    assertLinksWithinLimit(relation, targetKeys.length, options.maxKeys);
    if (targetKeys.length === 0) return [];

    const matched = await target.find({
      select: [relation.on.to],
      where: combine(Where.in(relation.on.to, targetKeys), narrowing),
      withDeleted: options.withDeleted,
      ctx: options.ctx(),
    });
    const matchedKeys = new Set(matched.map((row) => row[relation.on.to]));

    return distinct(
      links
        .filter((link) => matchedKeys.has(link[toKey]))
        .map((link) => link[fromKey]),
    );
  }

  private relation(
    relations: ReadonlyMap<string, FederatedRelation>,
    name: string,
  ): FederatedRelation {
    const federated = relations.get(name);
    if (!federated) {
      throw new FederationException({
        message: 'Relation "%s" is not federated',
        messageParams: [name],
      });
    }
    return federated;
  }

  /** The one repository `forRoot()` registered for the relation's target. */
  private target({
    targetEntity,
  }: RepositoryRelationMetadataInterface): RepositoryInterface<PlainLiteralObject> {
    const [item, ...others] = this.registry.getByEntityName(targetEntity);
    if (!item || others.length > 0) {
      throw new FederationException({
        message: 'No single repository is registered for %s',
        messageParams: [targetEntity],
        fault: 'usage',
      });
    }
    return item.adapter;
  }

  private junction({
    name,
    through,
  }: RepositoryRelationMetadataInterface): RepositoryInterface<PlainLiteralObject> {
    if (!through) {
      throw new FederationException({
        message: 'Relation "%s" has no junction',
        messageParams: [name],
      });
    }
    return this.repository(through.urn, `the junction of "${name}"`);
  }

  /** The repository `RepositoryModule.forRoot()` bound for `urn`. */
  private repository(
    urn: string,
    label: string,
  ): RepositoryInterface<PlainLiteralObject> {
    const item = this.registry.getByUrn(urn);
    if (!item) {
      throw new FederationException({
        message: 'No repository is registered for %s (%s)',
        messageParams: [label, urn],
        fault: 'usage',
      });
    }
    return item.adapter;
  }
}

function columnsOf(entries: { federated: FederatedRelation }[]): string[] {
  return distinct(entries.map(({ federated }) => federated.relation.on.from));
}

/** `column IN (keys)`, or a clause matching nothing when there are none. */
function inKeys(column: string, keys: unknown[]): WhereClause {
  return keys.length ? Where.in(column, keys) : Where.never();
}

function combine(
  root: WhereClause | undefined,
  constraints: WhereClause[],
): WhereClause | undefined {
  const parts = [root, ...constraints].filter(isDefined);
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return Where.and(...parts);
}

/** The distinct values, without `null` or `undefined`. */
function distinct<T>(values: T[]): NonNullable<T>[] {
  return [...new Set(values.filter(isDefined))];
}

function isDefined<T>(value: T): value is NonNullable<T> {
  return value !== undefined && value !== null;
}

function groupBy(
  rows: PlainLiteralObject[],
  keyOf: (row: PlainLiteralObject) => unknown,
): Map<unknown, PlainLiteralObject[]> {
  const groups = new Map<unknown, PlainLiteralObject[]>();
  for (const row of rows) {
    const key = keyOf(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

function assertWithinLimit(
  relation: RepositoryRelationMetadataInterface,
  keys: number,
  maxKeys: number,
): void {
  if (keys > maxKeys) {
    throw new FederationException({
      message:
        'Reading federated relation "%s" needs %d keys in one query, over ' +
        'the limit of %d (federation.maxKeys). Read fewer rows at once',
      messageParams: [relation.name, keys, maxKeys],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
    });
  }
}

/** Refuse a many-to-many whose junction links to more than `maxKeys` rows. */
function assertLinksWithinLimit(
  relation: RepositoryRelationMetadataInterface,
  keys: number,
  maxKeys: number,
): void {
  if (keys > maxKeys) {
    throw new FederationException({
      message:
        'The rows read link to %d %s rows through federated relation "%s", ' +
        'over the limit of %d (federation.maxKeys). Raise ' +
        'federation.maxKeys, or read fewer rows at once',
      messageParams: [keys, relation.targetEntity, relation.name, maxKeys],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
    });
  }
}

function tooBroad(
  entries: { federated: FederatedRelation }[],
  maxKeys: number,
): FederationException {
  const names = entries
    .map(({ federated }) => `"${federated.relation.name}"`)
    .join(', ');
  return new FederationException({
    message:
      'The filter on federated relation %s matches more than %d rows on both ' +
      'sides (federation.maxKeys). Narrow the conditions on the root or on ' +
      'the relation',
    messageParams: [names, maxKeys],
    httpStatus: HttpStatus.BAD_REQUEST,
    fault: 'client',
  });
}
