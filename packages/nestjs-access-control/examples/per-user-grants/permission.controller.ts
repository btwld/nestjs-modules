import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Put,
} from '@nestjs/common';

import {
  AccessControlGrant,
  AccessControlService,
  type AccessRuleInterface,
} from '@concepta/nestjs-access-control';
import { type AppContextHost, Ctx } from '@concepta/nestjs-core';

import { PermissionStore } from './permission.store.js';

@Controller()
export class PermissionController {
  constructor(
    private readonly permissions: PermissionStore,
    private readonly accessControl: AccessControlService,
  ) {}

  /**
   * What the caller may do, for a UI to grey out the rest. Needs no grant:
   * everyone may ask about themselves.
   */
  @Get('me/permissions')
  mine(@Ctx() ctx: AppContextHost): Promise<AccessRuleInterface[]> {
    return this.accessControl.effectiveRules(ctx);
  }

  @Get('admin/users/:userId/rules')
  @AccessControlGrant({ resource: 'user-rules', action: 'read' })
  rulesOf(@Param('userId') userId: string): AccessRuleInterface[] {
    return this.permissions.userRulesOf(userId);
  }

  @Put('admin/users/:userId/rules')
  @AccessControlGrant({ resource: 'user-rules', action: 'update' })
  setRules(
    @Ctx() ctx: AppContextHost,
    @Param('userId') userId: string,
    @Body() rules: AccessRuleInterface[],
  ): AccessRuleInterface[] {
    const editor = this.accessControl.decision(ctx)?.actor;

    if (editor?.kind !== 'role' || !editor.userId) {
      throw new ForbiddenException('Only a person edits rules');
    }

    this.permissions.setUserRules(editor.userId, userId, rules);
    return this.permissions.userRulesOf(userId);
  }
}
