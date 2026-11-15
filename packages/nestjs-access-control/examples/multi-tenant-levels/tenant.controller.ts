import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  AccessControlCreateOne,
  AccessControlDeleteOne,
  AccessControlQuery,
  AccessControlReadMany,
  AccessControlReadOne,
  AccessControlUpdateOne,
} from '@concepta/nestjs-access-control';
import { ActorCtx, type AppContextHost, Ctx } from '@concepta/nestjs-core';

import { ownRecordsOnly } from './level-rules.util.js';
import { OwnProjectQuery } from './own-project.query.js';
import { type ProjectInterface } from './project.interface.js';
import { ProjectStore } from './project.store.js';
import { ROLE_LEVELS } from './tenant-directory.js';

@Controller('tenants/:tenantId')
export class TenantController {
  constructor(private readonly projects: ProjectStore) {}

  /**
   * The tenant's projects, or only their own for a caller whose level there
   * is `view-own`. In an application on `@concepta/nestjs-repository`, row
   * scope narrows the rows instead.
   */
  @Get('projects')
  @AccessControlReadMany('project')
  list(
    @Ctx() ctx: AppContextHost,
    @Param('tenantId') tenantId: string,
  ): ProjectInterface[] {
    const actor = ctx.with(ActorCtx);

    if (!ownRecordsOnly(ROLE_LEVELS, actor, 'project', 'read')) {
      return this.projects.inTenant(tenantId);
    }

    return actor.kind === 'role' && actor.userId
      ? this.projects.ownedBy(tenantId, actor.userId)
      : [];
  }

  @Post('projects')
  @AccessControlCreateOne('project')
  create(
    @Ctx() ctx: AppContextHost,
    @Param('tenantId') tenantId: string,
    @Body() { name }: Pick<ProjectInterface, 'name'>,
  ): ProjectInterface {
    // Whoever creates a project owns it, so a level limited to its own
    // projects (`edit-own`) may create one.
    const actor = ctx.with(ActorCtx);

    if (actor.kind !== 'role' || !actor.userId) {
      throw new ForbiddenException('Only a person can own a project');
    }

    return this.projects.create(tenantId, actor.userId, name);
  }

  @Patch('projects/:id')
  @AccessControlUpdateOne('project')
  @AccessControlQuery({ service: OwnProjectQuery })
  rename(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() { name }: Pick<ProjectInterface, 'name'>,
  ): ProjectInterface {
    return this.projects.rename(tenantId, id, name);
  }

  @Delete('projects/:id')
  @AccessControlDeleteOne('project')
  @AccessControlQuery({ service: OwnProjectQuery })
  remove(@Param('tenantId') tenantId: string, @Param('id') id: string): void {
    this.projects.remove(tenantId, id);
  }

  @Get('budget')
  @AccessControlReadOne('budget')
  budget(@Param('tenantId') tenantId: string) {
    return { tenantId, total: 250000, spent: 90000 };
  }
}
