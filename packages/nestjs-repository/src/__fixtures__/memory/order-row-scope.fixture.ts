import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import { type RowScopeQueryParams } from '../../row-scope/interfaces/row-scope.interface.js';
import { RowScopeBase } from '../../row-scope/row-scope-base.js';

/** The scope shape these fixtures put on `RowScopeCtx`. */
export interface TenantScopeFixture extends PlainLiteralObject {
  tenantId: string;
  role?: string;
}

/**
 * Tenant scoping, with every tenant's rows readable by an admin. The bypass
 * overrides `scopeQuery` only, so it never widens a write — but it does widen
 * reads, so the resolver is not joinable.
 */
@Injectable()
export class OrderRowScopeFixture extends RowScopeBase<TenantScopeFixture> {
  constructor() {
    super({ scope: ['tenantId'] });
  }

  override scopeQuery<Options extends { where?: WhereClause }>(
    params: RowScopeQueryParams<Options, TenantScopeFixture>,
  ): Options {
    if (params.scope?.role === 'admin') return params.options;

    return super.scopeQuery(params);
  }
}

/** Joinable tenant scoping, reading exactly by `tenantId`. */
@Injectable()
export class JoinableTenantRowScopeFixture extends RowScopeBase<TenantScopeFixture> {
  constructor() {
    super({ scope: ['tenantId'], joinable: true });
  }
}

/** A second class, joinable on the same terms. */
@Injectable()
export class OtherJoinableTenantRowScopeFixture extends RowScopeBase<TenantScopeFixture> {
  constructor() {
    super({ scope: ['tenantId'], joinable: true });
  }
}

/** Joinable on `tenantId`, but read from another `RowScopeCtx` key. */
@Injectable()
export class OrgRowScopeFixture extends RowScopeBase<TenantScopeFixture> {
  constructor() {
    super({ scope: [{ column: 'tenantId', key: 'orgId' }], joinable: true });
  }
}
