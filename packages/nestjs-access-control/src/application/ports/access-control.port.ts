import { ExecutionContext, Injectable, Type } from '@nestjs/common';
import { Query, QueryBus } from '@nestjs/cqrs';

export interface CheckAccessQueryInterface extends Query<boolean> {
  executionContext: ExecutionContext;
}

export interface FilterResponseAttributesQueryInterface extends Query<unknown> {
  executionContext: ExecutionContext;
  data: unknown;
}

export interface ResolveUserRolesQueryInterface extends Query<
  string | string[]
> {
  executionContext: ExecutionContext;
}

export interface AccessControlPortSettings {
  checkAccessQuery?: Type<CheckAccessQueryInterface>;
  filterResponseAttributesQuery?: Type<FilterResponseAttributesQueryInterface>;
  resolveUserRolesQuery?: Type<ResolveUserRolesQueryInterface>;
}

@Injectable()
export class AccessControlPort {
  constructor(
    private readonly portSettings: Required<AccessControlPortSettings>,
    private readonly queryBus: QueryBus,
  ) {}

  async checkAccess(executionContext: ExecutionContext): Promise<boolean> {
    return this.queryBus.execute(
      new this.portSettings.checkAccessQuery(executionContext),
    );
  }

  async filterResponseAttributes(
    executionContext: ExecutionContext,
    data: unknown,
  ): Promise<unknown> {
    return this.queryBus.execute(
      new this.portSettings.filterResponseAttributesQuery(
        executionContext,
        data,
      ),
    );
  }

  async resolveUserRoles(
    executionContext: ExecutionContext,
  ): Promise<string | string[]> {
    return this.queryBus.execute(
      new this.portSettings.resolveUserRolesQuery(executionContext),
    );
  }
}
