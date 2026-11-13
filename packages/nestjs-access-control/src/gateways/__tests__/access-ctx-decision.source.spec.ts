import { AppContextHost } from '@concepta/nestjs-core';

import { type AccessDecisionInterface } from '../../domain/interfaces/access-decision.interface.js';
import { createAccessAbility } from '../../domain/utils/create-access-ability.util.js';
import { AccessCtxDecisionSource } from '../access-ctx-decision.source.js';
import { AccessDecisionCtx } from '../interfaces/access-decision-context.interface.js';

describe(AccessCtxDecisionSource.name, () => {
  it('returns the decision the route guard defined', () => {
    const decision: AccessDecisionInterface = {
      query: {
        actor: { kind: 'role', roles: ['clerk'] },
        action: 'update',
        resource: 'document',
      },
      ability: createAccessAbility([]),
    };
    const ctx = new AppContextHost();
    ctx.defineOverlay(AccessDecisionCtx, decision);

    expect(new AccessCtxDecisionSource().decisionFor(ctx)).toEqual(decision);
  });

  it('returns nothing for a call that passed no route check', () => {
    expect(new AccessCtxDecisionSource().decisionFor({})).toBeUndefined();
  });
});
