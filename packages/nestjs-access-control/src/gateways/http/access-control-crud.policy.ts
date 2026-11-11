import { type PlainLiteralObject } from '@nestjs/common';

import { Operation } from '@concepta/nestjs-core';
import {
  type CrudParsedQueryInterface,
  type CrudRequestInterface,
  type CrudRequestPolicyInterface,
} from '@concepta/nestjs-crud';

import { PossessionEnum } from '../../domain/enums/possession.enum.js';
import { AccessRefusedException } from '../../domain/exceptions/access-refused.exception.js';
import { type AccessDecisionSourceInterface } from '../../domain/interfaces/access-decision-source.interface.js';
import { type AccessDecisionInterface } from '../../domain/interfaces/access-decision.interface.js';
import { type AccessControlService } from '../../domain/services/access-control.service.js';
import {
  accessFieldPaths,
  normalizeAccessFieldPath,
  toWireArray,
  toWireRecord,
} from '../../domain/utils/access-field-paths.util.js';
import { canReadAccessField } from '../../domain/utils/can-read-access-field.util.js';
import { AccessCtxDecisionSource } from '../access-ctx-decision.source.js';

const READ_ANY = `read:${PossessionEnum.ANY}`;
const READ_OWN = `read:${PossessionEnum.OWN}`;

/**
 * Checks a CRUD request against the grant its route let the call in on,
 * before the request runs. Register it as `CrudModule`'s `requestPolicy`.
 *
 * - A filter, `or`, search or sort naming a field the caller may not read,
 *   or one above a field denied to them, is refused, on every operation:
 *   matching or ordering by a field tells its value without showing it.
 * - A create, update or each item of a batch create must touch only fields
 *   the caller may write, as `assertFields` checks them; a create's route
 *   parameters, written into the row, included.
 * - A replace erases what it leaves out, so it needs the action on the
 *   whole resource: no deny naming a field, and an allow naming none.
 * - A call no route grant checked is left alone.
 *
 * What the caller selects is not narrowed: the response filter leaves out
 * what they may not read.
 */
export class AccessControlCrudPolicy implements CrudRequestPolicyInterface {
  constructor(
    private readonly accessControl: AccessControlService,
    private readonly decisions: AccessDecisionSourceInterface = new AccessCtxDecisionSource(),
  ) {}

  async check<Entity extends PlainLiteralObject>({
    ctx,
    body,
  }: CrudRequestInterface<Entity>): Promise<void> {
    const decision = this.decisions.decisionFor(ctx);
    if (!decision) return;

    const unreadable = queryFieldPaths(ctx.query).find(
      (path) => !canQueryField(decision, path),
    );
    if (unreadable !== undefined) {
      throw refused(decision, unreadable);
    }

    // A create also writes the route's parameters, merged into the row.
    const params = Object.keys(ctx.params);

    switch (ctx.operation) {
      case Operation.Create:
        await this.accessControl.assertFields(ctx, [
          ...accessFieldPaths(body),
          ...params,
        ]);
        return;
      case Operation.Update:
        await this.accessControl.assertFields(ctx, accessFieldPaths(body));
        return;
      case Operation.CreateBatch:
        for (const item of toWireArray(toWireRecord(body)?.bulk) ?? []) {
          await this.accessControl.assertFields(ctx, [
            ...accessFieldPaths(item),
            ...params,
          ]);
        }
        return;
      case Operation.Replace:
        assertReplaceable(decision);
        await this.accessControl.assertFields(ctx, accessFieldPaths(body));
        return;
      default:
        return;
    }
  }
}

function refused(
  { query }: AccessDecisionInterface,
  field?: string,
): AccessRefusedException {
  return new AccessRefusedException({
    action: `${query.action}:${query.possession}`,
    subject: query.resource,
    actor: query.actor,
    reason: 'field',
    ...(field === undefined ? {} : { field }),
  });
}

/**
 * Whether the caller may filter, search or sort on `path`: they may read it,
 * and nothing beneath it is denied to them, since matching a whole value
 * tests every part of it.
 */
function canQueryField(
  { query, ability }: AccessDecisionInterface,
  path: string,
): boolean {
  const field = normalizeAccessFieldPath(path);
  if (!canReadAccessField(ability, query, field)) return false;

  const read = ability.can(READ_ANY, query.resource) ? READ_ANY : READ_OWN;
  // `possibleRulesFor`, not `rulesFor`: the latter leaves out field denies.
  return !ability
    .possibleRulesFor(read, query.resource)
    .some(
      (rule) =>
        rule.inverted &&
        (rule.fields ?? []).some((denied) => denied.startsWith(`${field}.`)),
    );
}

/**
 * A replace writes every field, erasing what its body leaves out, so it
 * needs the decided action on the whole resource: some allow naming no
 * fields, and no deny naming any.
 */
function assertReplaceable(decision: AccessDecisionInterface): void {
  const { query, ability } = decision;
  const rules = ability.possibleRulesFor(
    `${query.action}:${query.possession}`,
    query.resource,
  );

  const denied = rules
    .filter((rule) => rule.inverted)
    .flatMap((rule) => rule.fields ?? [])
    .at(0);
  if (denied !== undefined) throw refused(decision, denied);

  if (!rules.some((rule) => !rule.inverted && !rule.fields?.length)) {
    throw refused(decision);
  }
}

/** Every field path a parsed CRUD query filters, searches or sorts on. */
function queryFieldPaths<Entity extends PlainLiteralObject>(
  query: CrudParsedQueryInterface<Entity>,
): string[] {
  const pathOf = ({
    field,
    relation,
  }: {
    field: string;
    relation?: string;
  }): string => (relation ? `${relation}.${field}` : field);

  return [
    ...query.filter.map(pathOf),
    ...query.or.map(pathOf),
    ...query.sort.map(pathOf),
    ...searchFieldPaths(query.search),
  ];
}

/**
 * The fields a search condition names: every key but `$and` and `$or`,
 * whose conditions are searched too, at any depth.
 */
function searchFieldPaths(condition: unknown): string[] {
  const record = toWireRecord(condition);
  if (!record) return [];

  return Object.entries(record).flatMap(([key, value]) => {
    const nested = (toWireArray(value) ?? []).flatMap(searchFieldPaths);
    if (key === '$and' || key === '$or') return nested;
    return [key, ...nested];
  });
}
