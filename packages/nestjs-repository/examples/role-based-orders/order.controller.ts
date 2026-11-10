import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { AppContextHost, Ctx } from '@concepta/nestjs-core';
import {
  InjectDynamicRepository,
  type RepositoryInterface,
  SortOrder,
  Where,
} from '@concepta/nestjs-repository';

import { type OrderEntity } from './order.entity.js';
import { ORDERS } from './order.rules.js';

/**
 * A plain controller: it passes the request's `ctx` to every repository call
 * and checks nothing itself. Every rule in `order.rules.ts` is enforced by
 * the repository.
 */
@Controller('orders')
export class OrderController {
  constructor(
    @InjectDynamicRepository(ORDERS)
    private readonly orders: RepositoryInterface<OrderEntity>,
  ) {}

  @Get()
  list(
    @Ctx() ctx: AppContextHost,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
  ) {
    return this.orders.find({
      where: status ? Where.eq('status', status) : undefined,
      order: sort ? [{ field: sort, order: SortOrder.ASC }] : undefined,
      ctx,
    });
  }

  @Get(':id')
  async read(@Ctx() ctx: AppContextHost, @Param('id') id: string) {
    return this.find(ctx, id);
  }

  @Post()
  create(@Ctx() ctx: AppContextHost, @Body() body: Partial<OrderEntity>) {
    return this.orders.create(body, { ctx });
  }

  @Patch(':id')
  async update(
    @Ctx() ctx: AppContextHost,
    @Param('id') id: string,
    @Body() body: Partial<OrderEntity>,
  ) {
    return this.orders.update(await this.find(ctx, id), body, { ctx });
  }

  @Delete(':id')
  async delete(@Ctx() ctx: AppContextHost, @Param('id') id: string) {
    return this.orders.delete(await this.find(ctx, id), { ctx });
  }

  private async find(ctx: AppContextHost, id: string): Promise<OrderEntity> {
    const order = await this.orders.findOne({ where: Where.eq('id', id), ctx });
    if (!order) throw new NotFoundException();
    return order;
  }
}
