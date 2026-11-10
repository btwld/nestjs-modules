import { type PlainLiteralObject } from '@nestjs/common';

import { type AuthorityDecision } from './authority-decision.type.js';
import { type AuthorityRequestInterface } from './authority-request.interface.js';

/**
 * Decides which actions an actor may take on which objects, and on which of
 * their columns.
 *
 * Every check in one call should agree: an implementation that can change at
 * runtime answers a call from one snapshot, kept on `ctx`.
 */
export interface AuthorityInterface {
  decide(
    ctx: PlainLiteralObject,
    request: AuthorityRequestInterface,
  ): AuthorityDecision | Promise<AuthorityDecision>;
}
