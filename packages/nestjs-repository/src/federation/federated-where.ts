import { HttpStatus } from '@nestjs/common';

import {
  isWhereCompound,
  isWhereCondition,
  type WhereClause,
  type WhereCondition,
} from '../repository/interfaces/where-clause.interface.js';
import {
  WhereCompoundOperator,
  WhereOperator,
} from '../repository/repository.types.js';
import { Where } from '../repository/where.helpers.js';

import { FederationException } from './exceptions/federation.exception.js';

/**
 * A where clause split into what the root's own store can run and, per
 * federated relation, what that relation's repository runs.
 */
export interface FederatedWhere {
  /** Conditions on the root's own columns and its ordinary joins. */
  readonly root: WhereClause | undefined;
  /** Per federated relation, its conditions written on its own columns. */
  readonly relations: ReadonlyMap<string, WhereClause>;
}

/**
 * Split `where` at its top-level `AND`s.
 *
 * Each part must name either no federated relation, or exactly one and
 * nothing else, since the two are read from different stores. A part mixing
 * them, such as an `OR` across the root and a federated relation, is refused,
 * and so is `isNull` on a federated relation: a join matches it for a root
 * with no related row at all, which a read of the related rows cannot see.
 */
export function splitFederatedWhere(
  where: WhereClause | undefined,
  federated: ReadonlySet<string>,
): FederatedWhere {
  if (!where) return { root: undefined, relations: new Map() };

  const root: WhereClause[] = [];
  const relations = new Map<string, WhereClause[]>();

  for (const part of conjuncts(where)) {
    const tags = new Set<string>();
    let other = false;

    for (const leaf of leaves(part)) {
      if (leaf.relation === undefined || !federated.has(leaf.relation)) {
        other = true;
        continue;
      }
      if (leaf.operator === WhereOperator.IS_NULL) {
        throw new FederationException({
          message:
            'Cannot filter federated relation "%s" with isNull: it is read ' +
            'from its own repository, which cannot see a row with no ' +
            '"%s" at all. Filter on a value it has instead',
          messageParams: [leaf.relation, leaf.relation],
          httpStatus: HttpStatus.BAD_REQUEST,
          fault: 'client',
        });
      }
      tags.add(leaf.relation);
    }

    const [relation, ...others] = tags;
    if (relation === undefined) {
      root.push(part);
    } else if (others.length === 0 && !other) {
      relations.set(relation, [
        ...(relations.get(relation) ?? []),
        untagged(part),
      ]);
    } else {
      throw new FederationException({
        message:
          'Cannot combine federated relation "%s" with other conditions ' +
          'under OR: it is read from its own repository. Combine them with ' +
          'AND, or keep an OR within the one relation',
        messageParams: [relation],
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      });
    }
  }

  return {
    root: combined(root),
    relations: new Map(
      [...relations].flatMap(([name, parts]): [string, WhereClause][] => {
        const clause = combined(parts);
        return clause ? [[name, clause]] : [];
      }),
    ),
  };
}

/** Every part of `clause` joined by a top-level `AND`, at any depth. */
function conjuncts(clause: WhereClause): WhereClause[] {
  if (
    isWhereCompound(clause) &&
    clause.operator === WhereCompoundOperator.AND
  ) {
    return clause.conditions.flatMap(conjuncts);
  }
  return [clause];
}

/** Every field condition in `clause`, at any depth. */
function leaves(clause: WhereClause): WhereCondition[] {
  if (isWhereCondition(clause)) return [clause];
  if (isWhereCompound(clause)) return clause.conditions.flatMap(leaves);
  return [];
}

/** `clause` with every relation tag removed. */
function untagged(clause: WhereClause): WhereClause {
  if (isWhereCondition(clause)) {
    const { relation: _relation, ...own } = clause;
    return own;
  }
  if (isWhereCompound(clause)) {
    return { ...clause, conditions: clause.conditions.map(untagged) };
  }
  return clause;
}

function combined(parts: WhereClause[]): WhereClause | undefined {
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return Where.and(...parts);
}
