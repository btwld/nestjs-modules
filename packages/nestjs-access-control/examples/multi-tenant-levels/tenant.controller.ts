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
  AccessControlOwnInHandler,
  AccessControlQuery,
  AccessControlReadMany,
  AccessControlReadOne,
  AccessControlService,
  AccessControlUpdateOne,
  PossessionEnum,
} from '@concepta/nestjs-access-control';
import { ActorCtx, type AppContextHost, Ctx } from '@concepta/nestjs-core';

import { OwnProjectQuery } from './own-project.query.js';
import { type ProjectInterface } from './project.interface.js';
import { ProjectStore } from './project.store.js';

@Controller('tenants/:tenantId')
export class TenantController {
  constructor(
    private readonly projects: ProjectStore,
    private readonly accessControl: AccessControlService,
  ) {}

  /**
   * The tenant's projects for a caller the route let in on `any`, their own
   * for one on `own` (`view-own`): a route with no query service lets every
   * `own` holder through, so the handler narrows the rows.
   */
  @Get('projects')
  @AccessControlReadMany('project')
  @AccessControlOwnInHandler()
  list(
    @Ctx() ctx: AppContextHost,
    @Param('tenantId') tenantId: string,
  ): ProjectInterface[] {
    const decision = this.accessControl.decision(ctx);

    if (decision?.possession === PossessionEnum.ANY) {
      return this.projects.inTenant(tenantId);
    }

    return decision?.actor.kind === 'role' && decision.actor.userId
      ? this.projects.ownedBy(tenantId, decision.actor.userId)
      : [];
  }

  @Post('projects')
  @AccessControlCreateOne('project')
  @AccessControlOwnInHandler()
  create(
    @Ctx() ctx: AppContextHost,
    @Param('tenantId') tenantId: string,
    @Body() { name }: Pick<ProjectInterface, 'name'>,
  ): ProjectInterface {
    // Whoever creates a project owns it, so `create:own` is enough.
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
  remove(@Param('tenantId') tenantId: string, @Param('id') id: string): void {
    this.projects.remove(tenantId, id);
  }

  @Get('budget')
  @AccessControlReadOne('budget')
  budget(@Param('tenantId') tenantId: string) {
    return { tenantId, total: 250000, spent: 90000 };
  }
}
