import { type PlainLiteralObject } from '@nestjs/common';

import {
  type Actor,
  ActorCtx,
  actorKeys,
  AppContextHost,
  type AuthorityDecision,
  type AuthorityInterface,
  type AuthorityRequestInterface,
} from '@concepta/nestjs-core';

/**
 * Decisions keyed `<actor key> <object> <action>`, e.g.
 * `role:clerk orders read`. Any refusal among an actor's keys wins, then any
 * allow; a request nothing answers is refused.
 */
export type AuthorityTableFixture = Record<string, AuthorityDecision>;

export class AuthorityFixture implements AuthorityInterface {
  /** Every request, in order. */
  readonly requests: AuthorityRequestInterface[] = [];

  constructor(private readonly table: AuthorityTableFixture = {}) {}

  decide(
    _ctx: PlainLiteralObject,
    request: AuthorityRequestInterface,
  ): AuthorityDecision {
    this.requests.push(request);

    const decisions = actorKeys(request.actor)
      .map((key) => this.table[`${key} ${request.object} ${request.action}`])
      .filter((decision) => decision !== undefined);

    return (
      decisions.find(({ effect }) => effect === 'refuse') ??
      decisions.find(({ effect }) => effect === 'allow') ?? {
        effect: 'refuse',
      }
    );
  }
}

/** A ctx carrying `actor`, defined as authentication would. */
export function actorCtx(actor: Actor): AppContextHost {
  const ctx = new AppContextHost();
  ctx.defineOverlay(ActorCtx, actor, { immutable: true });
  return ctx;
}

/** Allow every listed action on `object` to `actorKey`. */
export function allow(
  actorKey: string,
  object: string,
  actions: string[],
): AuthorityTableFixture {
  return Object.fromEntries(
    actions.map((action): [string, AuthorityDecision] => [
      `${actorKey} ${object} ${action}`,
      { effect: 'allow' },
    ]),
  );
}
