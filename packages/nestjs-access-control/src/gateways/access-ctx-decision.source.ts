import { type PlainLiteralObject } from '@nestjs/common';

import { AppContextHost } from '@concepta/nestjs-core';

import { type AccessDecisionSourceInterface } from '../domain/interfaces/access-decision-source.interface.js';
import { type AccessDecisionInterface } from '../domain/interfaces/access-decision.interface.js';

import { AccessDecisionCtx } from './interfaces/access-decision-context.interface.js';

/**
 * The decision is whatever the route guard defined on the call's context.
 * The module wires it into `AccessControlService`; pass it yourself only
 * when constructing the service by hand.
 */
export class AccessCtxDecisionSource implements AccessDecisionSourceInterface {
  decisionFor(ctx: PlainLiteralObject): AccessDecisionInterface | undefined {
    const host = AppContextHost.from(ctx);

    return host.supports(AccessDecisionCtx)
      ? host.with(AccessDecisionCtx)
      : undefined;
  }
}
