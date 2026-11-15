import { type PlainLiteralObject } from '@nestjs/common';

import { AuthorityActionRefusedException } from '../../../domain/authority/exceptions/authority-action-refused.exception.js';
import { type AuthorityInterface } from '../../../domain/authority/interfaces/authority.interface.js';
import { normalizeActor } from '../../../domain/authority/utils/normalize-actor.util.js';
import { ActorCtx } from '../../context/actor.context.js';
import { AppContextHost } from '../../context/app-context.host.js';

/**
 * Throws `AuthorityActionRefusedException` (403) unless `authority` allows
 * the actor acting on `ctx` to take `action` on `subject`: a domain
 * operation with no write of its own to decide it, such as `approve` or
 * `export`. Asked with no columns, so it decides the action only. A write
 * carries its operation in its own options instead (`action`), so the
 * repository decides it with its columns.
 *
 * Nobody acting on `ctx` is a refusal too.
 */
export async function assertAuthority(
  ctx: PlainLiteralObject,
  authority: AuthorityInterface,
  subject: string,
  action: string,
): Promise<void> {
  const host = AppContextHost.from(ctx);
  if (!host.supports(ActorCtx)) {
    throw new AuthorityActionRefusedException(subject, action, {
      refusal: 'no-actor',
    });
  }

  const actor = normalizeActor(host.with(ActorCtx));
  const decision = await authority.decide(ctx, {
    actor,
    subject,
    action,
    columns: [],
  });

  if (decision.effect !== 'allow') {
    throw new AuthorityActionRefusedException(subject, action, {
      refusal: 'authority',
      actor,
      ...(decision.gate === undefined ? {} : { gate: decision.gate }),
    });
  }
}
