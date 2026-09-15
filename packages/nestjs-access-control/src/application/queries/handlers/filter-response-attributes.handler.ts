import { IQueryInfo } from 'accesscontrol';

import { Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';

import {
  ACCESS_CONTROL_MODULE_GRANT_METADATA,
  ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
} from '../../../access-control.constants.js';
import { PossessionEnum } from '../../../domain/enums/possession.enum.js';
import { AccessControlGrantOptionInterface } from '../../../domain/interfaces/access-control-grant-option.interface.js';
import { AccessControlSettingsInterface } from '../../../infrastructure/config/interfaces/access-control-settings.interface.js';
import { FilterResponseAttributesQuery } from '../impl/filter-response-attributes.query.js';
import { ResolveUserRolesQuery } from '../impl/resolve-user-roles.query.js';

@QueryHandler(FilterResponseAttributesQuery)
export class FilterResponseAttributesHandler implements IQueryHandler<
  FilterResponseAttributesQuery,
  unknown
> {
  constructor(
    @Inject(ACCESS_CONTROL_MODULE_SETTINGS_TOKEN)
    private readonly settings: AccessControlSettingsInterface,
    private readonly reflector: Reflector,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: FilterResponseAttributesQuery): Promise<unknown> {
    const { executionContext, data } = query;

    const acGrants = this.reflector.get<AccessControlGrantOptionInterface[]>(
      ACCESS_CONTROL_MODULE_GRANT_METADATA,
      executionContext.getHandler(),
    );

    if (!acGrants || !Array.isArray(acGrants)) {
      return data;
    }

    const userRoles = await this.queryBus.execute<
      ResolveUserRolesQuery,
      string | string[]
    >(new ResolveUserRolesQuery(executionContext));

    for (const grant of acGrants) {
      let permission = this.getPermission(userRoles, grant, PossessionEnum.ANY);
      if (permission.granted && permission.attributes)
        return permission.filter(data);

      permission = this.getPermission(userRoles, grant, PossessionEnum.OWN);
      if (permission.granted && permission.attributes)
        return permission.filter(data);

      return data;
    }

    return data;
  }

  private getPermission(
    userRoles: string | string[],
    grant: AccessControlGrantOptionInterface,
    possession: PossessionEnum,
  ) {
    const rules = this.settings.rules;
    const query: IQueryInfo = {
      role: userRoles,
      action: grant.action,
      resource: grant.resource,
      possession,
    };
    return rules.permission(query);
  }
}
