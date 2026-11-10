import { mock } from 'vitest-mock-extended';

import { type ExecutionContext } from '@nestjs/common';

import { AppContextHost } from '@concepta/nestjs-core';

import { AccessControlContext } from '../access-control.context.js';
import { PossessionEnum } from '../enums/possession.enum.js';
import { type AccessQueryInterface } from '../interfaces/access-query.interface.js';
import { createAccessAbility } from '../utils/create-access-ability.util.js';

describe(AccessControlContext.name, () => {
  it('returns what it was given', () => {
    const ctx = new AppContextHost();
    const executionContext = mock<ExecutionContext>();
    const ability = createAccessAbility([
      { action: 'read:own', subject: 'invoice' },
    ]);
    const query: AccessQueryInterface = {
      actor: { kind: 'role', roles: ['clerk'], userId: 'u1' },
      action: 'read',
      possession: PossessionEnum.OWN,
      resource: 'invoice',
    };

    const context = new AccessControlContext({
      ctx,
      query,
      ability,
      request: { body: { b1: 'xyz' } },
      executionContext,
    });

    expect(context.getContext()).toBe(ctx);
    expect(context.getActor()).toEqual(query.actor);
    expect(context.getQuery()).toEqual(query);
    expect(context.getAbility()).toBe(ability);
    expect(context.getRequest()).toEqual({ body: { b1: 'xyz' } });
    expect(context.getRequest('body')).toEqual({ b1: 'xyz' });
    expect(context.getRequest('not-a-real-prop')).toBeUndefined();
    expect(context.getExecutionContext()).toBe(executionContext);
  });

  it('has no request property without a request', () => {
    const context = new AccessControlContext({
      ctx: new AppContextHost(),
      query: {
        actor: { kind: 'system', name: 'agile' },
        action: 'read',
        possession: PossessionEnum.ANY,
        resource: 'invoice',
      },
      ability: createAccessAbility([]),
      request: undefined,
      executionContext: mock<ExecutionContext>(),
    });

    expect(context.getRequest('body')).toBeUndefined();
  });
});
