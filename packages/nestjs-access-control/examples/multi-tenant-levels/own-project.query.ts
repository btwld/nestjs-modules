import { Injectable } from '@nestjs/common';

import {
  type AccessControlContextInterface,
  type CanAccess,
  PossessionEnum,
} from '@concepta/nestjs-access-control';

import { routeParam } from '../shared/route-param.util.js';

import { ProjectStore } from './project.store.js';

/**
 * A caller who got through on an `own` grant may change only the projects
 * they own in the tenant the route names.
 */
@Injectable()
export class OwnProjectQuery implements CanAccess {
  constructor(private readonly projects: ProjectStore) {}

  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    if (context.getQuery().possession === PossessionEnum.ANY) {
      return true;
    }

    const actor = context.getActor();
    const tenantId = routeParam(context, 'tenantId');
    const id = routeParam(context, 'id');

    return (
      actor.kind === 'role' &&
      tenantId !== undefined &&
      id !== undefined &&
      this.projects.get(tenantId, id)?.ownerId === actor.userId
    );
  }
}
