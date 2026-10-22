import { IQueryInfo } from 'accesscontrol';

import { ExecutionContext, Inject } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';

import {
  ACCESS_CONTROL_MODULE_GRANT_METADATA,
  ACCESS_CONTROL_MODULE_QUERY_METADATA,
  ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
} from '../../../access-control.constants.js';
import { AccessControlContext } from '../../../domain/access-control.context.js';
import { PossessionEnum } from '../../../domain/enums/possession.enum.js';
import { AccessControllerException } from '../../../domain/exceptions/access-controller.exception.js';
import { AccessControlGrantOptionInterface } from '../../../domain/interfaces/access-control-grant-option.interface.js';
import { AccessControlQueryOptionInterface } from '../../../domain/interfaces/access-control-query-option.interface.js';
import { CanAccess } from '../../../domain/policies/can-access.policy.js';
import { AccessControlServiceInterface } from '../../../domain/ports/access-control-service.interface.js';
import { AccessControlSettingsInterface } from '../../../infrastructure/config/interfaces/access-control-settings.interface.js';
import { AccessControlService } from '../../../infrastructure/services/access-control.service.js';
import { CheckAccessQuery } from '../impl/check-access.query.js';
import { ResolveUserRolesQuery } from '../impl/resolve-user-roles.query.js';

@QueryHandler(CheckAccessQuery)
export class CheckAccessHandler implements IQueryHandler<
  CheckAccessQuery,
  boolean
> {
  constructor(
    @Inject(ACCESS_CONTROL_MODULE_SETTINGS_TOKEN)
    private readonly settings: AccessControlSettingsInterface,
    @Inject(AccessControlService)
    private readonly service: AccessControlServiceInterface,
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: CheckAccessQuery): Promise<boolean> {
    return this.checkAccessGrants(query.executionContext);
  }

  protected async checkAccessGrants(
    context: ExecutionContext,
  ): Promise<boolean> {
    const rules = this.settings.rules;

    const acGrants = this.reflector.get<AccessControlGrantOptionInterface[]>(
      ACCESS_CONTROL_MODULE_GRANT_METADATA,
      context.getHandler(),
    );

    if (!acGrants || !Array.isArray(acGrants)) {
      return true;
    }

    const userRoles = await this.queryBus.execute<
      ResolveUserRolesQuery,
      string | string[]
    >(new ResolveUserRolesQuery(context));
    const possessions = [PossessionEnum.ANY, PossessionEnum.OWN];
    const queriesPermitted: IQueryInfo[] = [];

    loopGrants: for (const acGrant of acGrants) {
      for (const possession of possessions) {
        const query: IQueryInfo = {
          role: userRoles,
          possession,
          ...acGrant,
        };
        const permission = rules.permission(query);
        if (permission.granted) {
          queriesPermitted.push(query);
          break loopGrants;
        }
      }
    }

    if (queriesPermitted.length) {
      return this.checkAccessQueries(context, queriesPermitted);
    }

    return false;
  }

  protected async checkAccessQueries(
    context: ExecutionContext,
    queriesPermitted: IQueryInfo[],
  ): Promise<boolean> {
    const targets = [context.getClass(), context.getHandler()];

    const acQueries = this.reflector.getAllAndMerge<
      AccessControlQueryOptionInterface[]
    >(
      ACCESS_CONTROL_MODULE_QUERY_METADATA,
      targets.filter((t) => t),
    );

    if (!acQueries || !Array.isArray(acQueries) || !acQueries.length) {
      return true;
    }

    const request: unknown = context.switchToHttp().getRequest<unknown>();

    if (!request || typeof request !== 'object') {
      return false;
    }

    const user = await this.service.getUser(context);

    let authorized = true;

    loopQueries: for await (const acQuery of acQueries) {
      const service = await this.getQueryService(acQuery);

      for await (const query of queriesPermitted) {
        const accessControlContext = new AccessControlContext({
          request,
          user,
          query,
          accessControl: this.settings.rules,
          executionContext: context,
        });

        authorized = await service.canAccess(accessControlContext);

        if (authorized) {
          break loopQueries;
        }
      }
    }

    return authorized;
  }

  private async getQueryService(
    queryOption: AccessControlQueryOptionInterface,
  ): Promise<CanAccess> {
    const queryService = this.moduleRef.resolve(queryOption.service);

    if (queryService) {
      return queryService;
    } else {
      throw new AccessControllerException(
        `Access control guard was unable to resolve service ${queryOption.service.name}`,
      );
    }
  }
}
