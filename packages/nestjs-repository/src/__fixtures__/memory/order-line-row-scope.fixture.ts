import {
  HttpStatus,
  Injectable,
  type PlainLiteralObject,
} from '@nestjs/common';

import { InjectDynamicRepository } from '../../decorators/inject-dynamic-repository.decorator.js';
import { type RepositoryInterface } from '../../repository/interfaces/repository.interface.js';
import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import { Where } from '../../repository/where.helpers.js';
import {
  type RowScopeQueryParams,
  type RowScopeWriteParams,
} from '../../row-scope/interfaces/row-scope.interface.js';
import { RowScopeBase } from '../../row-scope/row-scope-base.js';

import { type TenantScopeFixture } from './order-row-scope.fixture.js';
import {
  ORDER_LINE_TOKEN,
  ORDER_TOKEN,
  type OrderFixture,
  type OrderLineFixture,
} from './order.fixture.js';

/**
 * The README's foreign-key resolver: a line's `orderId` must point at an order
 * in the caller's tenant, read through the orders repository so the orders
 * resolver scopes it. Admins read every tenant, so the tenant compare is what
 * refuses them.
 */
@Injectable()
export class OrderLineRowScopeFixture extends RowScopeBase<
  OrderLineFixture,
  TenantScopeFixture
> {
  constructor(
    @InjectDynamicRepository(ORDER_LINE_TOKEN)
    orderLines: RepositoryInterface<OrderLineFixture>,
    @InjectDynamicRepository(ORDER_TOKEN)
    private readonly orders: RepositoryInterface<OrderFixture>,
  ) {
    super(orderLines, {
      scopeKey: 'tenantId',
      column: 'tenantId',
      label: 'Order line',
    });
  }

  override scopeQuery<Options extends { where?: WhereClause }>(
    params: RowScopeQueryParams<Options, TenantScopeFixture>,
  ): Options {
    if (params.scope?.role === 'admin') return params.options;

    return super.scopeQuery(params);
  }

  override async scopeWrite<Value extends PlainLiteralObject>(
    params: RowScopeWriteParams<Value, TenantScopeFixture>,
  ): Promise<Value> {
    const scoped = await super.scopeWrite(params);

    const orderId: unknown = scoped.orderId;
    if (orderId === undefined) return scoped;

    const order = await this.orders.findOne({
      where: Where.eq('id', orderId),
      ctx: params.ctx,
    });

    if (!order || order.tenantId !== params.scope?.tenantId) {
      this.refuse(HttpStatus.FORBIDDEN, 'Order line must point at your order');
    }

    return scoped;
  }
}
