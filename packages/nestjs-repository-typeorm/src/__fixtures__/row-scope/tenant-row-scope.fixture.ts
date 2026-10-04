import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import {
  InjectDynamicRepository,
  type RepositoryInterface,
  RowScopeBase,
  type RowScopeQueryParams,
  type WhereClause,
} from '@concepta/nestjs-repository';

import { type OrderEntityFixture } from './order.entity.fixture.js';
import { ROW_SCOPE_ORDER_TOKEN } from './row-scope.constants.fixture.js';

/** The scope shape this deployment puts on `RowScopeCtx`. */
export interface TenantScopeFixture extends PlainLiteralObject {
  tenantId: string;
  role?: string;
}

/**
 * Single-column tenant scoping with a read-only cross-tenant bypass, as an
 * implementer would write it.
 *
 * The bypass is a `scopeQuery` override and nothing else. It cannot reach a
 * write: `scopeWrite`'s pre-check carries the scope column in its own `WHERE`,
 * so widening the read side leaves every write confined to this caller's tenant.
 */
@Injectable()
export class TenantRowScopeFixture extends RowScopeBase<
  OrderEntityFixture,
  TenantScopeFixture
> {
  constructor(
    @InjectDynamicRepository(ROW_SCOPE_ORDER_TOKEN)
    orders: RepositoryInterface<OrderEntityFixture>,
  ) {
    super(orders, { scopeKey: 'tenantId', column: 'tenantId', label: 'Order' });
  }

  override scopeQuery<Options extends { where?: WhereClause }>(
    params: RowScopeQueryParams<Options, TenantScopeFixture>,
  ): Options {
    // An internal dashboard reads every tenant's rows.
    if (params.scope?.role === 'admin') return params.options;

    return super.scopeQuery(params);
  }
}
