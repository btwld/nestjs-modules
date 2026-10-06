import { AccessControl } from 'accesscontrol';
import { mock } from 'vitest-mock-extended';

import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type QueryBus } from '@nestjs/cqrs';

import { ActionEnum } from '@concepta/nestjs-core';

import { ACCESS_CONTROL_MODULE_GRANT_METADATA } from '../../../../access-control.constants.js';
import { type AccessControlSettingsInterface } from '../../../../infrastructure/config/interfaces/access-control-settings.interface.js';
import { FilterResponseAttributesQuery } from '../../impl/filter-response-attributes.query.js';
import { FilterResponseAttributesHandler } from '../filter-response-attributes.handler.js';

describe(FilterResponseAttributesHandler.name, () => {
  const resource = 'user_resource';

  function buildRules() {
    const rules = new AccessControl();
    rules.grant('viewer').readAny(resource, ['firstName', 'lastName']);
    rules.lock();
    return rules;
  }

  function buildHandler(rules: AccessControl, roles: string[]) {
    const settings: AccessControlSettingsInterface = { rules };
    const reflector = new Reflector();
    const queryBus = mock<QueryBus>();
    queryBus.execute.mockResolvedValue(roles);
    return {
      handler: new FilterResponseAttributesHandler(
        settings,
        reflector,
        queryBus,
      ),
      reflector,
      queryBus,
    };
  }

  it('returns data unchanged when no grants are set on the handler', async () => {
    const { handler } = buildHandler(buildRules(), ['viewer']);
    const context = mock<ExecutionContext>();
    context.getHandler.mockReturnValue(() => undefined);

    const data = { firstName: 'A', lastName: 'B', phone: 'C' };
    const result = await handler.execute(
      new FilterResponseAttributesQuery(context, data),
    );

    expect(result).toEqual(data);
  });

  it('filters data to allowed attributes when permission is granted', async () => {
    const rules = buildRules();
    const { handler } = buildHandler(rules, ['viewer']);
    const handlerFn = () => undefined;
    Reflect.defineMetadata(
      ACCESS_CONTROL_MODULE_GRANT_METADATA,
      [{ resource, action: ActionEnum.READ }],
      handlerFn,
    );

    const context = mock<ExecutionContext>();
    context.getHandler.mockReturnValue(handlerFn);

    const result = await handler.execute(
      new FilterResponseAttributesQuery(context, {
        firstName: 'A',
        lastName: 'B',
        phone: 'C',
      }),
    );

    expect(result).toEqual({ firstName: 'A', lastName: 'B' });
  });

  it('returns data unchanged when the role has no grant for the resource', async () => {
    const rules = new AccessControl();
    rules.grant('viewer').readAny('other_resource', ['firstName']);
    rules.lock();
    const { handler } = buildHandler(rules, ['viewer']);
    const handlerFn = () => undefined;
    Reflect.defineMetadata(
      ACCESS_CONTROL_MODULE_GRANT_METADATA,
      [{ resource, action: ActionEnum.READ }],
      handlerFn,
    );

    const context = mock<ExecutionContext>();
    context.getHandler.mockReturnValue(handlerFn);

    const data = { firstName: 'A', lastName: 'B', phone: 'C' };
    const result = await handler.execute(
      new FilterResponseAttributesQuery(context, data),
    );

    expect(result).toEqual(data);
  });
});
