import { Injectable } from '@nestjs/common';

import {
  type AccessControlContextInterface,
  type CanAccess,
} from '@concepta/nestjs-access-control';

import { routeParam } from '../shared/route-param.util.js';

import { ownRecordsOnly } from './level-rules.util.js';
import { ProjectStore } from './project.store.js';
import { ROLE_LEVELS } from './tenant-directory.js';

/**
 * Lets a caller whose level in the route's tenant is limited to their own
 * projects (`view-own`, `edit-own`) reach only the projects they own there;
 * anyone else is let through.
 *
 * A project that does not exist is refused like someone else's, so the
 * answer does not tell a limited caller which ids exist.
 */
@Injectable()
export class OwnProjectQuery implements CanAccess {
  constructor(private readonly projects: ProjectStore) {}

  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    const actor = context.getActor();
    const { action, resource } = context.getQuery();

    if (!ownRecordsOnly(ROLE_LEVELS, actor, resource, action)) {
      return true;
    }

    const tenantId = routeParam(context, 'tenantId');
    const id = routeParam(context, 'id');

    return (
      actor.kind === 'role' &&
      actor.userId !== undefined &&
      tenantId !== undefined &&
      id !== undefined &&
      this.projects.get(tenantId, id)?.ownerId === actor.userId
    );
  }
}
