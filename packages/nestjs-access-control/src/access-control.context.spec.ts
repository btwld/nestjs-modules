import { AccessControl } from 'accesscontrol';
import { mock } from 'jest-mock-extended';

import { Controller } from '@nestjs/common';
import { ExecutionContext, HttpArgumentsHost } from '@nestjs/common/interfaces';

import { AccessControlContext } from './access-control.context';
import { AccessControlReadOne } from './decorators/access-control-read-one.decorator';
import { ActionEnum } from './enums/action.enum';
import { PossessionEnum } from './enums/possession.enum';

describe(AccessControlContext.name, () => {
  it('should return expected values', () => {
    @Controller()
    @AccessControlReadOne('a_resource_name')
    class TestController {}

    const rules = new AccessControl();
    rules.grant('role1').readAny('a_resource_name');

    const argsHost = mock<HttpArgumentsHost>();
    argsHost.getRequest.mockReturnValue({ body: { b1: 'xyz' } });

    const context = mock<ExecutionContext>();
    context.getClass.mockReturnValue(TestController);
    context.switchToHttp.mockReturnValue(argsHost);

    const expectedAccessControlContext = new AccessControlContext({
      request: {
        body: { b1: 'xyz' },
      },
      user: { id: 1234 },
      query: {
        possession: PossessionEnum.OWN,
        resource: 'resource_create_own',
        action: ActionEnum.READ,
      },
      accessControl: rules,
      executionContext: context,
    });

    expect(expectedAccessControlContext.getRequest()).toEqual({
      body: { b1: 'xyz' },
    });
    expect(expectedAccessControlContext.getRequest('body')).toEqual({
      b1: 'xyz',
    });
    expect(expectedAccessControlContext.getRequest('not-a-real-prop')).toEqual(
      undefined,
    );
    expect(expectedAccessControlContext.getUser()).toEqual({ id: 1234 });
    expect(expectedAccessControlContext.getQuery()).toEqual({
      possession: PossessionEnum.OWN,
      resource: 'resource_create_own',
      action: ActionEnum.READ,
    });
    expect(expectedAccessControlContext.getAccessControl()).toEqual(rules);
    expect(expectedAccessControlContext.getExecutionContext()).toEqual(context);
  });
});
