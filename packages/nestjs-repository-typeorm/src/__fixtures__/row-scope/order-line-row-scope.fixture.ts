import {
  HttpStatus,
  Injectable,
  type PlainLiteralObject,
} from '@nestjs/common';

import {
  InjectDynamicRepository,
  type RepositoryInterface,
  RowScopeBase,
  type RowScopeQueryParams,
  type RowScopeWriteParams,
  Where,
  type WhereClause,
} from '@concepta/nestjs-repository';

import { type OrderLineEntityFixture } from './order-line.entity.fixture.js';
import { type OrderEntityFixture } from './order.entity.fixture.js';
import {
  ROW_SCOPE_ORDER_LINE_TOKEN,
  ROW_SCOPE_ORDER_TOKEN,
} from './row-scope.constants.fixture.js';
import { type TenantScopeFixture } from './tenant-row-scope.fixture.js';

/**
 * The same tenant scoping as the orders resolver, plus the foreign-key check
 * the base class cannot make: an order line's `orderId` must point at an order
 * in the same tenant. Nothing else enforces that — a scoped read on the lines
 * table says nothing about which order a line points at.
 *
 * This is also what makes a join safe. A non-federated `join` is resolved by
 * the driver in SQL, so the joined entity's resolver never runs; reading orders
 * with their lines is only in scope because every line was written through the
 * check below.
 */
@Injectable()
export class OrderLineRowScopeFixture extends RowScopeBase<
  OrderLineEntityFixture,
  TenantScopeFixture
> {
  constructor(
    @InjectDynamicRepository(ROW_SCOPE_ORDER_LINE_TOKEN)
    private readonly orderLines: RepositoryInterface<OrderLineEntityFixture>,
    @InjectDynamicRepository(ROW_SCOPE_ORDER_TOKEN)
    private readonly orders: RepositoryInterface<OrderEntityFixture>,
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

    // `transform` settles an `order` relation *object* into the `orderId`
    // column it backs, so one read covers both the scalar and the object. A
    // bare id (`order: '…'`) reads as undefined, so the driver fails the
    // write.
    const orderId = this.orderLines.transform(scoped).orderId;
    if (orderId === undefined) return scoped;

    if (typeof orderId !== 'string') {
      this.refuse(HttpStatus.BAD_REQUEST, 'Unusable order reference');
    }

    // Read through the order's own repository, so this is scoped by the orders
    // resolver rather than by a second, parallel tenant check.
    const order = await this.orders.findOne({
      where: Where.eq('id', orderId),
      ctx: params.ctx,
    });

    // Visibility alone is not enough: that read is unfiltered for an admin, so
    // compare the order's tenant against the one being written.
    if (!order || order.tenantId !== params.scope?.tenantId) {
      this.refuse(HttpStatus.FORBIDDEN, 'Order line must point at your order');
    }

    return scoped;
  }
}
