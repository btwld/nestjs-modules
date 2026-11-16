import { type PlainLiteralObject } from '@nestjs/common';

import { type AccessDecisionInterface } from './access-decision.interface.js';

/**
 * Finds the grant a checked route let a call through on, or `undefined`
 * when the call did not pass a route check.
 */
export interface AccessDecisionSourceInterface {
  decisionFor(ctx: PlainLiteralObject): AccessDecisionInterface | undefined;
}
