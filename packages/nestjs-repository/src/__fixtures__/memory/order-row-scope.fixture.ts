import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import { InjectDynamicRepository } from '../../decorators/inject-dynamic-repository.decorator.js';
import { type RepositoryInterface } from '../../repository/interfaces/repository.interface.js';
import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import { type RowScopeQueryParams } from '../../row-scope/interfaces/row-scope.interface.js';
import { RowScopeBase } from '../../row-scope/row-scope-base.js';

import { ORDER_TOKEN, type OrderFixture } from './order.fixture.js';

/** The scope shape these fixtures put on `RowScopeCtx`. */
export interface TenantScopeFixture extends PlainLiteralObject {
  tenantId: string;
  role?: string;
}

/**
 * Tenant scoping, with every tenant's rows readable by an admin. The bypass
 * overrides `scopeQuery` only, so it never widens a write.
 */
@Injectable()
export class OrderRowScopeFixture extends RowScopeBase<
  OrderFixture,
  TenantScopeFixture
> {
  constructor(
    @InjectDynamicRepository(ORDER_TOKEN)
    orders: RepositoryInterface<OrderFixture>,
  ) {
    super(orders, { scopeKey: 'tenantId', column: 'tenantId', label: 'Order' });
  }

  override scopeQuery<Options extends { where?: WhereClause }>(
    params: RowScopeQueryParams<Options, TenantScopeFixture>,
  ): Options {
    if (params.scope?.role === 'admin') return params.options;

    return super.scopeQuery(params);
  }
}
