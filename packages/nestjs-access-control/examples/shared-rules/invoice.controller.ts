import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  AccessControlCreateOne,
  AccessControlDeleteOne,
  AccessControlReadMany,
  AccessControlService,
  AccessControlUpdateOne,
  accessFieldPaths,
} from '@concepta/nestjs-access-control';
import { type AppContextHost, Ctx } from '@concepta/nestjs-core';
import {
  InjectDynamicRepository,
  type RepositoryInterface,
  Where,
} from '@concepta/nestjs-repository';

import { type InvoiceEntity } from './invoice.entity.js';
import { INVOICES } from './invoice.rules.js';

/**
 * Each route declares the action it takes; access control decides it by
 * the shared rules before the handler runs. The repository decides the data
 * the handler then reads and writes, by the same rules.
 */
@Controller('invoices')
export class InvoiceController {
  constructor(
    @InjectDynamicRepository(INVOICES)
    private readonly invoices: RepositoryInterface<InvoiceEntity>,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  @AccessControlReadMany(INVOICES)
  list(@Ctx() ctx: AppContextHost) {
    return this.invoices.find({ ctx });
  }

  @Post()
  @AccessControlCreateOne(INVOICES)
  create(@Ctx() ctx: AppContextHost, @Body() body: Partial<InvoiceEntity>) {
    return this.invoices.create(body, { ctx });
  }

  @Patch(':id')
  @AccessControlUpdateOne(INVOICES)
  async update(
    @Ctx() ctx: AppContextHost,
    @Param('id') id: string,
    @Body() body: Partial<InvoiceEntity>,
  ) {
    await this.accessControl.assertFields(ctx, accessFieldPaths(body));
    return this.invoices.update(await this.find(ctx, id), body, { ctx });
  }

  @Delete(':id')
  @AccessControlDeleteOne(INVOICES)
  async delete(@Ctx() ctx: AppContextHost, @Param('id') id: string) {
    return this.invoices.delete(await this.find(ctx, id), { ctx });
  }

  private async find(ctx: AppContextHost, id: string): Promise<InvoiceEntity> {
    const invoice = await this.invoices.findOne({
      where: Where.eq('id', id),
      ctx,
    });
    if (!invoice) throw new NotFoundException();
    return invoice;
  }
}
