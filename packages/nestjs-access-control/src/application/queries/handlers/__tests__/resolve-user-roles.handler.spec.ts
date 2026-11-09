import { mock } from 'vitest-mock-extended';

import { type ExecutionContext } from '@nestjs/common';

import { type AccessControlServiceInterface } from '../../../../domain/ports/access-control-service.interface.js';
import { ResolveUserRolesQuery } from '../../impl/resolve-user-roles.query.js';
import { ResolveUserRolesHandler } from '../resolve-user-roles.handler.js';

describe(ResolveUserRolesHandler.name, () => {
  it('delegates to AccessControlService.getUserRoles with the execution context', async () => {
    const service = mock<AccessControlServiceInterface>();
    service.getUserRoles.mockResolvedValue(['admin', 'user']);

    const handler = new ResolveUserRolesHandler(service);
    const context = mock<ExecutionContext>();

    const result = await handler.execute(new ResolveUserRolesQuery(context));

    expect(result).toEqual(['admin', 'user']);
    expect(service.getUserRoles).toHaveBeenCalledTimes(1);
    expect(service.getUserRoles).toHaveBeenCalledWith(context);
  });

  it('forwards a single-role string return value', async () => {
    const service = mock<AccessControlServiceInterface>();
    service.getUserRoles.mockResolvedValue('admin');

    const handler = new ResolveUserRolesHandler(service);
    const context = mock<ExecutionContext>();

    const result = await handler.execute(new ResolveUserRolesQuery(context));

    expect(result).toEqual('admin');
  });
});
