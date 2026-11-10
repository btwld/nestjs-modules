import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  AccessControlCreateOne,
  AccessControlDeleteOne,
  AccessControlReadMany,
  AccessControlReadOne,
  AccessControlService,
  AccessControlUpdateOne,
  accessFieldPaths,
} from '@concepta/nestjs-access-control';
import { type AppContextHost, Ctx } from '@concepta/nestjs-core';

import { type InvoiceInterface } from './invoice.interface.js';
import { InvoiceStore } from './invoice.store.js';

@Controller('invoices')
export class InvoiceController {
  constructor(
    private readonly invoices: InvoiceStore,
    private readonly accessControl: AccessControlService,
  ) {}

  @Get()
  @AccessControlReadMany('invoice')
  list(): InvoiceInterface[] {
    return this.invoices.all();
  }

  @Get(':id')
  @AccessControlReadOne('invoice')
  one(@Param('id') id: string): InvoiceInterface {
    return this.invoices.find(id);
  }

  @Post()
  @AccessControlCreateOne('invoice')
  async create(
    @Ctx() ctx: AppContextHost,
    @Body() fields: Omit<InvoiceInterface, 'id'>,
  ): Promise<InvoiceInterface> {
    await this.accessControl.assertFields(ctx, accessFieldPaths(fields));

    return this.invoices.create(fields);
  }

  @Patch(':id')
  @AccessControlUpdateOne('invoice')
  async update(
    @Ctx() ctx: AppContextHost,
    @Param('id') id: string,
    @Body() changes: Partial<InvoiceInterface>,
  ): Promise<InvoiceInterface> {
    // The route guard checked the resource; a write also checks each field
    // it touches, under the grant the guard let the caller in on.
    await this.accessControl.assertFields(ctx, accessFieldPaths(changes));

    return this.invoices.update(id, changes);
  }

  @Delete(':id')
  @AccessControlDeleteOne('invoice')
  remove(@Param('id') id: string): void {
    this.invoices.remove(id);
  }
}
