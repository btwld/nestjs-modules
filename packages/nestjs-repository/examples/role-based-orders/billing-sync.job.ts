import { Injectable } from '@nestjs/common';

import { ActorCtx, AppContextHost } from '@concepta/nestjs-core';
import {
  InjectDynamicRepository,
  type RepositoryInterface,
  Where,
} from '@concepta/nestjs-repository';

import { type OrderEntity } from './order.entity.js';
import { ORDER } from './order.rules.js';

/**
 * A job the billing integration triggers, outside any HTTP request. It acts
 * as the `billing-sync` system, so the repository decides it by that
 * system's rules — never by the roles of whatever account runs the process.
 */
@Injectable()
export class BillingSyncJob {
  constructor(
    @InjectDynamicRepository(ORDER)
    private readonly orders: RepositoryInterface<OrderEntity>,
  ) {}

  async settle(id: string, changes: Partial<OrderEntity>) {
    const ctx = new AppContextHost();
    ctx.defineOverlay(
      ActorCtx,
      { kind: 'system', name: 'billing-sync' },
      { immutable: true },
    );

    const order = await this.orders.findOne({ where: Where.eq('id', id), ctx });
    if (!order) throw new Error(`No order ${id}`);
    return this.orders.update(order, changes, { ctx });
  }
}
